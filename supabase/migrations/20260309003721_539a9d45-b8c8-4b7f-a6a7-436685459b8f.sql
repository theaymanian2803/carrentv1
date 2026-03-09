
-- Allow admins to update profiles (e.g. KYC status)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all messages for moderation
CREATE POLICY "Admins can read all messages"
ON public.messages
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
