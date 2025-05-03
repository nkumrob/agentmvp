import { PrismaClient } from '@prisma/client';
import { recalculateAllCharacterCounts } from '../src/lib/character-count';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting character count recalculation...');
  
  try {
    // Get all agents
    const agents = await prisma.agent.findMany();
    console.log(`Found ${agents.length} agents to process`);
    
    // Process each agent
    for (const agent of agents) {
      console.log(`Processing agent: ${agent.name} (${agent.id})`);
      
      try {
        // Recalculate character counts for all data sources of this agent
        await recalculateAllCharacterCounts(agent.id);
        console.log(`✅ Successfully recalculated character counts for agent: ${agent.name}`);
      } catch (error) {
        console.error(`❌ Error recalculating character counts for agent ${agent.name}:`, error);
      }
    }
    
    console.log('Character count recalculation completed!');
  } catch (error) {
    console.error('Error during character count recalculation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
