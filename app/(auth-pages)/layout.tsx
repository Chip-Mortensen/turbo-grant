export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container flex-1">
      <div className="flex flex-col items-center pt-20">
        <div className="mx-auto w-full max-w-[450px] space-y-6 bg-white p-8 rounded-lg shadow-sm border">
          {children}
        </div>
      </div>
    </div>
  );
}
