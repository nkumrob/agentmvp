// This script recalculates character counts for all data sources and agents
// Run with: node scripts/recalculate-character-counts.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function calculateDataSourceCharacterCount(dataSourceId) {
  try {
    // Get the data source
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      include: { chunks: true },
    });

    if (!dataSource) {
      console.error(`Data source with ID ${dataSourceId} not found`);
      return 0;
    }

    let characterCount = 0;

    // If the data source has content, count its characters
    if (dataSource.content) {
      characterCount = dataSource.content.length;
    } else if (dataSource.chunks.length > 0) {
      // Otherwise, sum up the character counts of all chunks
      characterCount = dataSource.chunks.reduce(
        (total, chunk) => total + (chunk.content?.length || 0),
        0
      );
    }

    // Update the data source with the calculated character count
    await prisma.dataSource.update({
      where: { id: dataSourceId },
      data: { characterCount },
    });

    console.log(`Updated data source ${dataSourceId} with ${characterCount} characters`);
    return characterCount;
  } catch (error) {
    console.error('Error calculating data source character count:', error);
    return 0;
  }
}

async function updateAgentTotalCharacterCount(agentId) {
  try {
    // Get all data sources for the agent
    const dataSources = await prisma.dataSource.findMany({
      where: { 
        agentId,
        status: 'completed', // Only count completed sources
      },
    });

    // Calculate total character count
    const totalCharacterCount = dataSources.reduce(
      (total, source) => total + source.characterCount,
      0
    );

    // Update the agent with the total character count
    await prisma.agent.update({
      where: { id: agentId },
      data: { totalCharacterCount },
    });

    console.log(`Updated agent ${agentId} with total of ${totalCharacterCount} characters`);
    return totalCharacterCount;
  } catch (error) {
    console.error('Error updating agent total character count:', error);
    return 0;
  }
}

async function recalculateAllCharacterCounts() {
  try {
    console.log('Starting character count recalculation...');
    
    // Get all data sources
    const dataSources = await prisma.dataSource.findMany();
    console.log(`Found ${dataSources.length} data sources to process`);
    
    // Process each data source
    for (const source of dataSources) {
      await calculateDataSourceCharacterCount(source.id);
    }
    
    // Get all agents
    const agents = await prisma.agent.findMany();
    console.log(`Found ${agents.length} agents to process`);
    
    // Update total character count for each agent
    for (const agent of agents) {
      await updateAgentTotalCharacterCount(agent.id);
    }
    
    console.log('Character count recalculation completed successfully');
  } catch (error) {
    console.error('Error recalculating character counts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the recalculation
recalculateAllCharacterCounts()
  .then(() => console.log('Script completed'))
  .catch((error) => console.error('Script failed:', error));
