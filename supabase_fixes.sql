-- Security Fix: Prevent regular users from updating restricted columns
-- in the daily_service_orders table (Broken Access Control fix)

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_dso_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the current user's role securely
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();

  -- If the user is not an admin or moderator, prevent changes to restricted columns
  IF user_role IS NULL OR user_role NOT IN ('admin', 'moderator') THEN
    -- Force restricted columns to remain unchanged
    NEW.confirmed = OLD.confirmed;
    NEW.company = OLD.company;
    NEW.user_id = OLD.user_id;
    NEW.user_badge = OLD.user_badge;
    NEW.user_name = OLD.user_name;
    NEW.date = OLD.date;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply the trigger to daily_service_orders
DROP TRIGGER IF EXISTS ensure_authorized_dso_updates ON public.daily_service_orders;
CREATE TRIGGER ensure_authorized_dso_updates
  BEFORE UPDATE ON public.daily_service_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_dso_updates();