
-- Enums
CREATE TYPE public.host_role AS ENUM ('host', 'checker');
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE public.event_status AS ENUM ('draft', 'published');
CREATE TYPE public.rsvp_status AS ENUM ('going', 'waitlist', 'cancelled');
CREATE TYPE public.photo_status AS ENUM ('pending', 'approved', 'hidden');
CREATE TYPE public.report_target AS ENUM ('event', 'photo');
CREATE TYPE public.report_status AS ENUM ('open', 'hidden', 'dismissed');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- hosts
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bio TEXT,
  logo_url TEXT,
  contact_email TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;

-- host_members
CREATE TABLE public.host_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.host_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (host_id, user_id, role)
);
ALTER TABLE public.host_members ENABLE ROW LEVEL SECURITY;

-- Security definer helpers (avoid recursive RLS)
CREATE OR REPLACE FUNCTION public.is_host_member(_host_id UUID, _user_id UUID, _role public.host_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.host_members WHERE host_id = _host_id AND user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_host_any_role(_host_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.host_members WHERE host_id = _host_id AND user_id = _user_id);
$$;

-- hosts policies
CREATE POLICY "hosts read all" ON public.hosts FOR SELECT USING (true);
CREATE POLICY "hosts insert own" ON public.hosts FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "hosts update by host role" ON public.hosts FOR UPDATE USING (public.is_host_member(id, auth.uid(), 'host'));
CREATE POLICY "hosts delete by creator" ON public.hosts FOR DELETE USING (auth.uid() = created_by);

-- Auto-add creator as host member
CREATE OR REPLACE FUNCTION public.handle_new_host()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.host_members (host_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'host');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_host_created AFTER INSERT ON public.hosts FOR EACH ROW EXECUTE FUNCTION public.handle_new_host();

-- host_members policies
CREATE POLICY "host_members read by member" ON public.host_members FOR SELECT
  USING (auth.uid() = user_id OR public.is_host_member(host_id, auth.uid(), 'host'));
CREATE POLICY "host_members insert by host" ON public.host_members FOR INSERT
  WITH CHECK (public.is_host_member(host_id, auth.uid(), 'host') OR auth.uid() = user_id);
CREATE POLICY "host_members delete by host" ON public.host_members FOR DELETE
  USING (public.is_host_member(host_id, auth.uid(), 'host'));

-- host_invites
CREATE TABLE public.host_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  role public.host_role NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.host_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites read by token or host" ON public.host_invites FOR SELECT USING (true);
CREATE POLICY "invites insert by host" ON public.host_invites FOR INSERT
  WITH CHECK (public.is_host_member(host_id, auth.uid(), 'host'));
CREATE POLICY "invites delete by host" ON public.host_invites FOR DELETE
  USING (public.is_host_member(host_id, auth.uid(), 'host'));

-- events
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  venue_address TEXT,
  online_link TEXT,
  capacity INTEGER NOT NULL DEFAULT 50,
  cover_image_url TEXT,
  visibility public.event_visibility NOT NULL DEFAULT 'public',
  status public.event_status NOT NULL DEFAULT 'draft',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events read public published" ON public.events FOR SELECT
  USING (status = 'published' OR public.is_host_any_role(host_id, auth.uid()));
CREATE POLICY "events insert by host" ON public.events FOR INSERT
  WITH CHECK (public.is_host_member(host_id, auth.uid(), 'host'));
CREATE POLICY "events update by host" ON public.events FOR UPDATE
  USING (public.is_host_member(host_id, auth.uid(), 'host'));
CREATE POLICY "events delete by host" ON public.events FOR DELETE
  USING (public.is_host_member(host_id, auth.uid(), 'host'));

-- rsvps
CREATE TABLE public.rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.rsvp_status NOT NULL DEFAULT 'going',
  waitlist_position INTEGER,
  ticket_code TEXT NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsvps read own or host or checker" ON public.rsvps FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_host_any_role(e.host_id, auth.uid()))
  );
CREATE POLICY "rsvps insert own" ON public.rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rsvps update own or by host/checker" ON public.rsvps FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_host_any_role(e.host_id, auth.uid()))
  );
CREATE POLICY "rsvps delete own" ON public.rsvps FOR DELETE USING (auth.uid() = user_id);

-- Waitlist promotion: when an RSVP becomes cancelled, promote the next waitlister
CREATE OR REPLACE FUNCTION public.promote_waitlist(_event_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  cap INTEGER;
  going_count INTEGER;
  next_id UUID;
BEGIN
  SELECT capacity INTO cap FROM public.events WHERE id = _event_id;
  LOOP
    SELECT COUNT(*) INTO going_count FROM public.rsvps WHERE event_id = _event_id AND status = 'going';
    EXIT WHEN going_count >= cap;
    SELECT id INTO next_id FROM public.rsvps
      WHERE event_id = _event_id AND status = 'waitlist'
      ORDER BY waitlist_position ASC NULLS LAST, created_at ASC LIMIT 1;
    EXIT WHEN next_id IS NULL;
    UPDATE public.rsvps SET status = 'going', waitlist_position = NULL WHERE id = next_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_rsvp_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'going' AND NEW.status = 'cancelled')
     OR (TG_OP = 'DELETE' AND OLD.status = 'going') THEN
    PERFORM public.promote_waitlist(OLD.event_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER rsvp_promote_on_change
  AFTER UPDATE OR DELETE ON public.rsvps
  FOR EACH ROW EXECUTE FUNCTION public.handle_rsvp_change();

CREATE OR REPLACE FUNCTION public.handle_event_capacity_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.capacity > OLD.capacity THEN
    PERFORM public.promote_waitlist(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER event_capacity_promote
  AFTER UPDATE OF capacity ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_event_capacity_change();

-- gallery_photos
CREATE TABLE public.gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status public.photo_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "photos read approved or own or host" ON public.gallery_photos FOR SELECT
  USING (
    status = 'approved'
    OR auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_host_member(e.host_id, auth.uid(), 'host'))
  );
CREATE POLICY "photos insert own" ON public.gallery_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "photos update by host" ON public.gallery_photos FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_host_member(e.host_id, auth.uid(), 'host')));
CREATE POLICY "photos delete by host or owner" ON public.gallery_photos FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_host_member(e.host_id, auth.uid(), 'host'))
  );

-- feedback
CREATE TABLE public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_feedback()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER feedback_validate BEFORE INSERT OR UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.validate_feedback();

CREATE POLICY "feedback read all" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "feedback insert own" ON public.feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feedback update own" ON public.feedback FOR UPDATE USING (auth.uid() = user_id);

-- reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type public.report_target NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports insert by signed in" ON public.reports FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "reports read own or by any host" ON public.reports FOR SELECT
  USING (
    auth.uid() = created_by
    OR EXISTS (SELECT 1 FROM public.host_members hm WHERE hm.user_id = auth.uid() AND hm.role = 'host')
  );
CREATE POLICY "reports update by any host" ON public.reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.host_members hm WHERE hm.user_id = auth.uid() AND hm.role = 'host'));

-- Storage buckets for cover images, host logos, gallery photos
INSERT INTO storage.buckets (id, name, public) VALUES
  ('event-covers', 'event-covers', true),
  ('host-logos', 'host-logos', true),
  ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read covers" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');
CREATE POLICY "auth upload covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth update covers" ON storage.objects FOR UPDATE USING (bucket_id = 'event-covers' AND auth.uid() IS NOT NULL);

CREATE POLICY "public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'host-logos');
CREATE POLICY "auth upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'host-logos' AND auth.uid() IS NOT NULL);
CREATE POLICY "auth update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'host-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "public read gallery" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');
CREATE POLICY "auth upload gallery" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND auth.uid() IS NOT NULL);
