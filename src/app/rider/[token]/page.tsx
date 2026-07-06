import RiderDashboard from "./RiderDashboard";

export default async function RiderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <RiderDashboard token={token} />;
}
