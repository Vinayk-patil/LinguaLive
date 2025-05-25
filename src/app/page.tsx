import PermissionRequester from '@/components/permissions/PermissionRequester';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
      <PermissionRequester />
    </div>
  );
}
