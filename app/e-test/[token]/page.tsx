import ClientPage from "./ClientPage";



export default async function ETestPage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const resolvedParams = await params;
  
  return <ClientPage token={resolvedParams.token} />;
}