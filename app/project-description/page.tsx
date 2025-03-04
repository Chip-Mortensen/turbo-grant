import { Metadata } from "next"
import { getResearchDescriptionVectors, getScientificFigureVectors, getChalkTalkVectors, getFOAVectors } from "@/lib/vectorization/query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PROJECT_ID = "989fbeb7-9b38-4a05-85d1-6b510e816728"
const FOA_ID = "b1805f73-ba74-4d02-bdc2-8a0d3a263b95"

export const metadata: Metadata = {
  title: "Project Description",
  description: "Experiment with LLM-generated project descriptions",
}

export default async function ProjectDescriptionPage() {
  // Fetch all vectors in parallel
  const [researchDescriptions, scientificFigures, chalkTalks, foaContent] = await Promise.all([
    getResearchDescriptionVectors(PROJECT_ID),
    getScientificFigureVectors(PROJECT_ID),
    getChalkTalkVectors(PROJECT_ID),
    getFOAVectors(FOA_ID)
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Project Description</h1>
      
      <Tabs defaultValue="inputs" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="outline">Outline</TabsTrigger>
          <TabsTrigger value="full">Full</TabsTrigger>
        </TabsList>

        <TabsContent value="inputs">
          {/* Research Descriptions Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Research Descriptions</h2>
            <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {researchDescriptions.matches.length > 0 ? (
                researchDescriptions.matches.map((match) => {
                  const text = match.metadata?.text || '';
                  const chunkIndex = match.metadata?.chunkIndex;
                  const totalChunks = match.metadata?.totalChunks;
                  
                  return (
                    <div key={match.id} className="mb-4 last:mb-0">
                      <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
                      {chunkIndex && totalChunks && (
                        <p className="text-sm text-gray-500 mt-1">
                          Part {chunkIndex} of {totalChunks}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No research descriptions found.</p>
              )}
            </div>
          </section>

          {/* Scientific Figures Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Scientific Figures</h2>
            <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {scientificFigures.matches.length > 0 ? (
                scientificFigures.matches.map((match) => {
                  const text = match.metadata?.text || '';
                  return (
                    <div key={match.id} className="mb-4 last:mb-0">
                      <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No scientific figures found.</p>
              )}
            </div>
          </section>

          {/* Chalk Talks Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Chalk Talks</h2>
            <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {chalkTalks.matches.length > 0 ? (
                chalkTalks.matches.map((match) => {
                  const text = match.metadata?.text || '';
                  const chunkIndex = match.metadata?.chunkIndex;
                  const totalChunks = match.metadata?.totalChunks;
                  
                  return (
                    <div key={match.id} className="mb-4 last:mb-0">
                      <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
                      {chunkIndex && totalChunks && (
                        <p className="text-sm text-gray-500 mt-1">
                          Part {chunkIndex} of {totalChunks}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No chalk talks found.</p>
              )}
            </div>
          </section>

          {/* FOA Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">FOA Content</h2>
            <div className="border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              {foaContent.matches.length > 0 ? (
                foaContent.matches.map((match) => {
                  const text = match.metadata?.text || '';
                  const chunkIndex = match.metadata?.chunkIndex;
                  const totalChunks = match.metadata?.totalChunks;
                  
                  return (
                    <div key={match.id} className="mb-4 last:mb-0">
                      <p className="text-gray-700 whitespace-pre-wrap">{text}</p>
                      {chunkIndex && totalChunks && (
                        <p className="text-sm text-gray-500 mt-1">
                          Part {chunkIndex} of {totalChunks}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-gray-500">No FOA content found.</p>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="outline">
          <div className="border rounded-lg p-4">
            <p className="text-gray-500">Outline section coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="full">
          <div className="border rounded-lg p-4">
            <p className="text-gray-500">Full section coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 