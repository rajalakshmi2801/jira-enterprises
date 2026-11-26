-- ============================================================
-- GST TAX INVOICE SUPPORT   (run once in Supabase SQL Editor)
-- Run AFTER schema + fixes.sql.  Safe to run more than once.
--
-- Model
--   * Only OUR GST is used.  Each product variant has a HSN code and a
--     GST % (Water = 0, Tata Glucose = e.g. 18).  CGST = SGST = GST % / 2.
--     CESS is always 0 and is only printed as 0 on the invoice.
--   * Selling price EXCLUDES GST.  GST is added on top.
--   * sales.total_amount = taxable value + GST  (what the shop must pay),
--     so payments / credit / pending balances stay correct.
--   * The GST % and every amount are saved on each sale line, so later
--     rate changes never alter an old invoice.
-- ============================================================

-- ---------- Customer & business details ----------
ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15),
    ADD COLUMN IF NOT EXISTS business_address TEXT,
    ADD COLUMN IF NOT EXISTS licence_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS licence_expiry DATE;

-- ---------- Product GST ----------
ALTER TABLE public.product_variants
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_variant_gst_percent'
    ) THEN
        ALTER TABLE public.product_variants
            ADD CONSTRAINT chk_variant_gst_percent
            CHECK (gst_percent >= 0 AND gst_percent <= 100);
    END IF;
END $$;

-- ---------- Sale GST snapshot ----------
ALTER TABLE public.sales
    ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

ALTER TABLE public.sale_items
    ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS taxable_value NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

UPDATE public.sale_items
SET taxable_value = subtotal
WHERE taxable_value IS NULL;

-- ------------------------------------------------------------
-- create_sale  (GST aware)
--   line total      = cases x price
--   line discount   = invoice discount shared in proportion to line total
--   taxable value   = line total - line discount
--   CGST = SGST     = taxable x (GST % / 2) / 100        (rounded to paise)
--   sale total      = sum(taxable) + sum(CGST + SGST)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_sale(
    p_customer_id UUID,
    p_sale_date TIMESTAMPTZ,
    p_discount_amount NUMERIC,
    p_notes TEXT,
    p_items JSONB,
    p_paid_amount NUMERIC,
    p_payment_method VARCHAR,
    p_transaction_reference VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_id UUID;
    v_subtotal NUMERIC(14,2) := 0;
    v_discount NUMERIC(14,2) := 0;
    v_paid NUMERIC(14,2) := 0;
    v_taxable_total NUMERIC(14,2) := 0;
    v_gst_total NUMERIC(14,2) := 0;
    v_grand NUMERIC(14,2) := 0;
    v_alloc NUMERIC(14,2) := 0;

    v_count INTEGER;
    v_idx BIGINT;
    v_item JSONB;
    v_variant_id UUID;
    v_qty INTEGER;
    v_price NUMERIC(12,2);
    v_cost NUMERIC(12,2);
    v_hsn VARCHAR(10);
    v_gst NUMERIC(5,2);
    v_line NUMERIC(14,2);
    v_line_disc NUMERIC(14,2);
    v_taxable NUMERIC(14,2);
    v_half NUMERIC(14,2);

    v_stock INTEGER;
    v_required INTEGER;
    v_name TEXT;
BEGIN
    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one sale item is required.';
    END IF;

    v_count := jsonb_array_length(p_items);

    v_discount := COALESCE(p_discount_amount, 0);
    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative.';
    END IF;

    v_paid := COALESCE(p_paid_amount, 0);
    IF v_paid < 0 THEN
        RAISE EXCEPTION 'Paid amount cannot be negative.';
    END IF;

    IF v_paid > 0
       AND (p_payment_method IS NULL
            OR p_payment_method NOT IN ('cash', 'upi')) THEN
        RAISE EXCEPTION 'Payment method must be cash or upi.';
    END IF;

    IF p_customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM customers WHERE id = p_customer_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Customer not found or inactive.';
    END IF;

    -- Pass 1: validate lines and get the subtotal (before discount)
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'product_variant_id')::UUID;
        v_qty        := (v_item->>'quantity_cases')::INTEGER;
        v_price      := (v_item->>'selling_price_per_case')::NUMERIC;

        IF v_qty <= 0 OR v_price < 0 THEN
            RAISE EXCEPTION 'Invalid sale quantity or selling price.';
        END IF;

        PERFORM 1 FROM product_variants
        WHERE id = v_variant_id AND is_active = TRUE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product variant not found or inactive.';
        END IF;

        v_subtotal := v_subtotal + (v_qty * v_price);
    END LOOP;

    IF v_discount > v_subtotal THEN
        RAISE EXCEPTION 'Discount cannot exceed sale subtotal.';
    END IF;

    -- Lock each distinct variant and validate stock
    FOR v_variant_id IN
        SELECT DISTINCT (value->>'product_variant_id')::UUID
        FROM jsonb_array_elements(p_items)
        ORDER BY 1
    LOOP
        SELECT variant_name INTO v_name
        FROM product_variants WHERE id = v_variant_id FOR UPDATE;

        SELECT COALESCE(SUM(quantity_cases), 0) INTO v_stock
        FROM stock_movements WHERE product_variant_id = v_variant_id;

        SELECT COALESCE(SUM((value->>'quantity_cases')::INTEGER), 0)
        INTO v_required
        FROM jsonb_array_elements(p_items)
        WHERE (value->>'product_variant_id')::UUID = v_variant_id;

        IF v_stock < v_required THEN
            RAISE EXCEPTION
                'Insufficient stock for %. Available: % cases, required: % cases.',
                v_name, v_stock, v_required;
        END IF;
    END LOOP;

    -- Sale header (totals are filled in after the lines are priced)
    INSERT INTO sales (
        customer_id, sale_date, total_amount, gst_amount,
        discount_amount, notes, status
    )
    VALUES (
        p_customer_id, COALESCE(p_sale_date, NOW()), 0, 0,
        v_discount, NULLIF(TRIM(p_notes), ''), 'completed'
    )
    RETURNING id INTO v_sale_id;

    -- Pass 2: price every line with GST and deduct stock
    FOR v_item, v_idx IN
        SELECT e.value, e.ordinality
        FROM jsonb_array_elements(p_items) WITH ORDINALITY AS e(value, ordinality)
    LOOP
        v_variant_id := (v_item->>'product_variant_id')::UUID;
        v_qty        := (v_item->>'quantity_cases')::INTEGER;
        v_price      := (v_item->>'selling_price_per_case')::NUMERIC;

        SELECT landing_price_per_case, hsn_code, COALESCE(gst_percent, 0)
        INTO v_cost, v_hsn, v_gst
        FROM product_variants WHERE id = v_variant_id;

        v_line := v_qty * v_price;

        IF v_idx = v_count THEN
            v_line_disc := v_discount - v_alloc;      -- last line takes the rounding rest
        ELSIF v_subtotal > 0 THEN
            v_line_disc := ROUND(v_discount * v_line / v_subtotal, 2);
        ELSE
            v_line_disc := 0;
        END IF;

        v_alloc := v_alloc + v_line_disc;
        v_taxable := v_line - v_line_disc;

        IF v_taxable < 0 THEN
            RAISE EXCEPTION 'Discount is too high for this sale.';
        END IF;

        v_half := ROUND(v_taxable * (v_gst / 2) / 100, 2);

        INSERT INTO sale_items (
            sale_id, product_variant_id, quantity_cases,
            cost_price_per_case, selling_price_per_case,
            hsn_code, gst_percent, discount_amount, taxable_value,
            cgst_amount, sgst_amount
        )
        VALUES (
            v_sale_id, v_variant_id, v_qty,
            COALESCE(v_cost, 0), v_price,
            v_hsn, v_gst, v_line_disc, v_taxable,
            v_half, v_half
        );

        INSERT INTO stock_movements (
            product_variant_id, movement_type, quantity_cases,
            reference_id, movement_date, remarks
        )
        VALUES (
            v_variant_id, 'sale', -v_qty, v_sale_id,
            COALESCE(p_sale_date, NOW()), 'Stock deducted through sale'
        );

        v_taxable_total := v_taxable_total + v_taxable;
        v_gst_total := v_gst_total + (v_half * 2);
    END LOOP;

    v_grand := v_taxable_total + v_gst_total;

    IF v_paid > v_grand THEN
        RAISE EXCEPTION 'Paid amount cannot exceed sale total.';
    END IF;

    UPDATE sales
    SET total_amount = v_grand, gst_amount = v_gst_total
    WHERE id = v_sale_id;

    IF v_paid > 0 THEN
        INSERT INTO payments (
            sale_id, payment_method, amount, payment_date,
            transaction_reference, notes
        )
        VALUES (
            v_sale_id, p_payment_method, v_paid,
            COALESCE(p_sale_date, NOW()),
            NULLIF(TRIM(p_transaction_reference), ''),
            'Payment received at sale'
        );
    END IF;

    RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_sale(
    UUID, TIMESTAMPTZ, NUMERIC, TEXT, JSONB, NUMERIC, VARCHAR, VARCHAR
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sale(
    UUID, TIMESTAMPTZ, NUMERIC, TEXT, JSONB, NUMERIC, VARCHAR, VARCHAR
) TO service_role;

-- ------------------------------------------------------------
-- create_product_with_variants  (now also saves HSN code + GST %)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_product_with_variants(
    p_category_id UUID,
    p_product_name VARCHAR,
    p_brand_name VARCHAR,
    p_description TEXT,
    p_variants JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_product_id UUID;
    v_variant_id UUID;
    v_item JSONB;
    v_initial_stock INTEGER;
    v_gst NUMERIC;
BEGIN
    IF p_category_id IS NULL
       OR NULLIF(TRIM(p_product_name), '') IS NULL THEN
        RAISE EXCEPTION 'Category and product name are required.';
    END IF;

    PERFORM 1 FROM public.product_categories
    WHERE id = p_category_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Category not found or inactive.';
    END IF;

    IF p_variants IS NULL
       OR jsonb_typeof(p_variants) <> 'array'
       OR jsonb_array_length(p_variants) = 0 THEN
        RAISE EXCEPTION 'At least one product variant is required.';
    END IF;

    INSERT INTO public.products (category_id, product_name, brand_name, description)
    VALUES (
        p_category_id, TRIM(p_product_name),
        NULLIF(TRIM(p_brand_name), ''), p_description
    )
    RETURNING id INTO v_product_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_variants)
    LOOP
        v_initial_stock := COALESCE((v_item->>'initial_stock_cases')::INTEGER, 0);
        v_gst := COALESCE((v_item->>'gst_percent')::NUMERIC, 0);

        IF v_initial_stock < 0 THEN
            RAISE EXCEPTION 'Initial stock cannot be negative.';
        END IF;

        IF COALESCE((v_item->>'pieces_per_case')::INTEGER, 0) <= 0 THEN
            RAISE EXCEPTION 'Pieces per case must be greater than zero.';
        END IF;

        IF COALESCE((v_item->>'landing_price_per_case')::NUMERIC, -1) < 0
           OR COALESCE((v_item->>'mrp_per_case')::NUMERIC, -1) < 0 THEN
            RAISE EXCEPTION 'Case prices cannot be negative.';
        END IF;

        IF v_gst < 0 OR v_gst > 100 THEN
            RAISE EXCEPTION 'GST percentage must be between 0 and 100.';
        END IF;

        INSERT INTO public.product_variants (
            product_id, variant_name, size_value, size_unit,
            pieces_per_case, landing_price_per_piece, mrp_per_piece,
            landing_price_per_case, mrp_per_case, hsn_code, gst_percent
        )
        VALUES (
            v_product_id,
            v_item->>'variant_name',
            (v_item->>'size_value')::NUMERIC,
            v_item->>'size_unit',
            (v_item->>'pieces_per_case')::INTEGER,
            (v_item->>'landing_price_per_piece')::NUMERIC,
            (v_item->>'mrp_per_piece')::NUMERIC,
            (v_item->>'landing_price_per_case')::NUMERIC,
            (v_item->>'mrp_per_case')::NUMERIC,
            NULLIF(TRIM(v_item->>'hsn_code'), ''),
            v_gst
        )
        RETURNING id INTO v_variant_id;

        IF v_initial_stock > 0 THEN
            INSERT INTO public.stock_movements (
                product_variant_id, movement_type, quantity_cases,
                reference_id, movement_date, remarks
            )
            VALUES (
                v_variant_id, 'opening_stock', v_initial_stock, NULL, NOW(),
                'Initial stock entered by owner during product creation'
            );
        END IF;
    END LOOP;

    RETURN v_product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_product_with_variants(
    UUID, VARCHAR, VARCHAR, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_product_with_variants(
    UUID, VARCHAR, VARCHAR, TEXT, JSONB
) TO service_role;

SELECT 'GST tax invoice support installed successfully!' AS message;
