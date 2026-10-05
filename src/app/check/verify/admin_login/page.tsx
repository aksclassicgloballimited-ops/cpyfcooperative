import AdminPortalLogin from '@/components/AdminPortalLogin';

export default function SuperAdminLoginPage() {
  return (
    <AdminPortalLogin
      allowedRoles={['SUPER_ADMIN']}
      portalTitle="Super Administrator Portal"
      heading="Super Admin Login"
      description="Restricted access. This login is reserved for the Super Administrator only."
      emailLabel="Super Admin Email"
      submitLabel="Sign In as Super Admin"
      successMessage="Access granted. Redirecting to the admin dashboard..."
    />
  );
}
