import AdminPortalLogin from '@/components/AdminPortalLogin';

export default function AdminLoginPage() {
  return (
    <AdminPortalLogin
      allowedRoles={['PRESIDENT', 'SUPER_ADMIN']}
      portalTitle="President Portal"
      heading="President Login"
      description="Restricted access. This login is reserved for the President and Super Administrator."
      emailLabel="President Email"
      submitLabel="Sign In as President"
      successMessage="Access granted. Redirecting to the admin dashboard..."
    />
  );
}
