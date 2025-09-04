import ProtectedAIGenerator from '@/components/protected-ai-generator';

export default async function Page() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Protected AI Question Generator</h2>
      {/* Client component triggers the protected API */}
      <ProtectedAIGenerator />
    </div>
  );
}
