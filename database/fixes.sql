-- ============================================================
-- JIRA ENTERPRISES - REQUIRED FIXES  (run once in Supabase SQL Editor)
-- Run AFTER all the original schema / migration scripts.
-- Safe to run more than once.
--
-- What this fixes
--   1. sale_items.subtotal / purchase_items.subtotal are GENERATED columns,
--      but create_sale() and create_purchase() INSERT a value into them.
--      PostgreSQL rejects that ("cannot insert a non-DEFAULT value ...").
--   2. create_sale() looped over a JSONB variable using a record-style
--      field (v_item.variant_id), which fails at run time.
--   3. invoice_number was never generated (always NULL).
--   4. Customer existence check inside create_sale().
-- ============================================================

-- ------------------------------------------------------------
-- 1. Invoice numbers:  JE-YYYYMMDD-00001
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.sales_invoice_seq START 1;

CREATE OR REPLACE FUNCTION public.set_sale_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number :=
            'JE-' || to_char(NOW(), 'YYYYMMDD') || '-' ||
            lpad(nextval('public.sales_invoice_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_invoice_number ON public.sales;
CREATE TRIGGER trg_sales_invoice_number
BEFORE INSERT ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.set_sale_invoice_number();

-- Back-fill invoice numbers for any earlier sales
UPDATE public.sales
SET invoice_number =
    'JE-' || to_char(sale_date, 'YYYYMMDD') || '-' ||
    lpad(nextval('public.sales_invoice_seq')::TEXT, 5, '0')
WHERE invoice_number IS NULL;

-- ------------------------------------------------------------
-- 2. create_purchase  (subtotal is generated - do not insert it)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_purchase(
    p_supplier_name VARCHAR,
    p_invoice_number VARCHAR,
    p_purchase_date TIMESTAMPTZ,
    p_notes TEXT,
    p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_purchase_id UUID;
    v_total NUMERIC(14,2) := 0;
    v_item JSONB;
    v_variant_id UUID;
    v_quantity INTEGER;
    v_price NUMERIC(12,2);
BEGIN
    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one purchase item is required.';
    END IF;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'product_variant_id')::UUID;
        v_quantity   := (v_item->>'quantity_cases')::INTEGER;
        v_price      := (v_item->>'purchase_price_per_case')::NUMERIC;

        IF v_quantity <= 0 OR v_price < 0 THEN
            RAISE EXCEPTION 'Invalid purchase quantity or price.';
        END IF;

        PERFORM 1
        FROM product_variants
        WHERE id = v_variant_id AND is_active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product variant not found or inactive.';
        END IF;

        v_total := v_total + (v_quantity * v_price);
    END LOOP;

    INSERT INTO purchase_records (
        supplier_name, invoice_number, purchase_date, total_amount, notes
    )
    VALUES (
        NULLIF(TRIM(p_supplier_name), ''),
        NULLIF(TRIM(p_invoice_number), ''),
        COALESCE(p_purchase_date, NOW()),
        v_total,
        p_notes
    )
    RETURNING id INTO v_purchase_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'product_variant_id')::UUID;
        v_quantity   := (v_item->>'quantity_cases')::INTEGER;
        v_price      := (v_item->>'purchase_price_per_case')::NUMERIC;

        INSERT INTO purchase_items (
            purchase_id, product_variant_id, quantity_cases,
            purchase_price_per_case
        )
        VALUES (v_purchase_id, v_variant_id, v_quantity, v_price);

        INSERT INTO stock_movements (
            product_variant_id, movement_type, quantity_cases,
            reference_id, movement_date, remarks
        )
        VALUES (
            v_variant_id, 'purchase', v_quantity, v_purchase_id,
            COALESCE(p_purchase_date, NOW()),
            'Stock added through purchase'
        );
    END LOOP;

    RETURN v_purchase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_purchase(
    VARCHAR, VARCHAR, TIMESTAMPTZ, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_purchase(
    VARCHAR, VARCHAR, TIMESTAMPTZ, TEXT, JSONB
) TO service_role;

-- ------------------------------------------------------------
-- 3. create_sale  (fixed loop + generated subtotal + customer check)
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
    v_sale_total NUMERIC(14,2) := 0;
    v_grand_total NUMERIC(14,2) := 0;
    v_paid_amount NUMERIC(14,2) := 0;
    v_discount NUMERIC(14,2) := 0;

    v_item JSONB;
    v_variant_id UUID;
    v_quantity INTEGER;
    v_selling_price NUMERIC(12,2);
    v_cost_price NUMERIC(12,2);

    v_current_stock INTEGER;
    v_required_stock INTEGER;
    v_variant_name TEXT;
BEGIN
    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'At least one sale item is required.';
    END IF;

    v_discount := COALESCE(p_discount_amount, 0);
    IF v_discount < 0 THEN
        RAISE EXCEPTION 'Discount cannot be negative.';
    END IF;

    v_paid_amount := COALESCE(p_paid_amount, 0);
    IF v_paid_amount < 0 THEN
        RAISE EXCEPTION 'Paid amount cannot be negative.';
    END IF;

    IF v_paid_amount > 0
       AND (p_payment_method IS NULL
            OR p_payment_method NOT IN ('cash', 'upi')) THEN
        RAISE EXCEPTION 'Payment method must be cash or upi.';
    END IF;

    -- Credit (unpaid) sales must belong to a customer
    IF p_customer_id IS NULL THEN
        NULL;
    ELSIF NOT EXISTS (
        SELECT 1 FROM customers WHERE id = p_customer_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Customer not found or inactive.';
    END IF;

    -- Validate items and calculate the subtotal
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id    := (v_item->>'product_variant_id')::UUID;
        v_quantity      := (v_item->>'quantity_cases')::INTEGER;
        v_selling_price := (v_item->>'selling_price_per_case')::NUMERIC;

        IF v_quantity <= 0 OR v_selling_price < 0 THEN
            RAISE EXCEPTION 'Invalid sale quantity or selling price.';
        END IF;

        PERFORM 1
        FROM product_variants
        WHERE id = v_variant_id AND is_active = TRUE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product variant not found or inactive.';
        END IF;

        v_sale_total := v_sale_total + (v_quantity * v_selling_price);
    END LOOP;

    IF v_discount > v_sale_total THEN
        RAISE EXCEPTION 'Discount cannot exceed sale subtotal.';
    END IF;

    v_grand_total := v_sale_total - v_discount;

    IF v_paid_amount > v_grand_total THEN
        RAISE EXCEPTION 'Paid amount cannot exceed sale total.';
    END IF;

    -- Lock each distinct variant and validate stock
    FOR v_variant_id IN
        SELECT DISTINCT (value->>'product_variant_id')::UUID
        FROM jsonb_array_elements(p_items)
        ORDER BY 1
    LOOP
        SELECT variant_name
        INTO v_variant_name
        FROM product_variants
        WHERE id = v_variant_id
        FOR UPDATE;

        SELECT COALESCE(SUM(quantity_cases), 0)
        INTO v_current_stock
        FROM stock_movements
        WHERE product_variant_id = v_variant_id;

        SELECT COALESCE(SUM((value->>'quantity_cases')::INTEGER), 0)
        INTO v_required_stock
        FROM jsonb_array_elements(p_items)
        WHERE (value->>'product_variant_id')::UUID = v_variant_id;

        IF v_current_stock < v_required_stock THEN
            RAISE EXCEPTION
                'Insufficient stock for %. Available: % cases, required: % cases.',
                v_variant_name, v_current_stock, v_required_stock;
        END IF;
    END LOOP;

    INSERT INTO sales (
        customer_id, sale_date, total_amount, discount_amount, notes, status
    )
    VALUES (
        p_customer_id, COALESCE(p_sale_date, NOW()), v_grand_total,
        v_discount, NULLIF(TRIM(p_notes), ''), 'completed'
    )
    RETURNING id INTO v_sale_id;

    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id    := (v_item->>'product_variant_id')::UUID;
        v_quantity      := (v_item->>'quantity_cases')::INTEGER;
        v_selling_price := (v_item->>'selling_price_per_case')::NUMERIC;

        SELECT landing_price_per_case
        INTO v_cost_price
        FROM product_variants
        WHERE id = v_variant_id;

        INSERT INTO sale_items (
            sale_id, product_variant_id, quantity_cases,
            cost_price_per_case, selling_price_per_case
        )
        VALUES (
            v_sale_id, v_variant_id, v_quantity,
            COALESCE(v_cost_price, 0), v_selling_price
        );

        INSERT INTO stock_movements (
            product_variant_id, movement_type, quantity_cases,
            reference_id, movement_date, remarks
        )
        VALUES (
            v_variant_id, 'sale', -v_quantity, v_sale_id,
            COALESCE(p_sale_date, NOW()),
            'Stock deducted through sale'
        );
    END LOOP;

    IF v_paid_amount > 0 THEN
        INSERT INTO payments (
            sale_id, payment_method, amount, payment_date,
            transaction_reference, notes
        )
        VALUES (
            v_sale_id, p_payment_method, v_paid_amount,
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
-- 4. create_product_with_variants must be callable by the backend only
--    (already granted in the original script; re-asserted here)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.create_product_with_variants(
    UUID, VARCHAR, VARCHAR, TEXT, JSONB
) TO service_role;

SELECT 'JIRA ENTERPRISES fixes applied successfully!' AS message;
