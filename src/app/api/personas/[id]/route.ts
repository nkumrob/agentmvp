import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/server/db/client';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personaId = params?.id;
    
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    // Get persona with examples
    const persona = await prisma.persona.findUnique({
      where: {
        id: personaId,
      },
      include: {
        examples: true,
      },
    });

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    return NextResponse.json(persona);
  } catch (error) {
    console.error('Error fetching persona:', error);
    return NextResponse.json({ error: 'Failed to fetch persona' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personaId = params?.id;
    
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const { name, description, toneRules } = body;

    // Check if persona exists
    const existingPersona = await prisma.persona.findUnique({
      where: {
        id: personaId,
      },
    });

    if (!existingPersona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Update persona
    const updatedPersona = await prisma.persona.update({
      where: {
        id: personaId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        toneRules: toneRules !== undefined ? JSON.stringify(toneRules) : undefined,
      },
      include: {
        examples: true,
      },
    });

    return NextResponse.json(updatedPersona);
  } catch (error) {
    console.error('Error updating persona:', error);
    return NextResponse.json({ error: 'Failed to update persona' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personaId = params?.id;
    
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    // Check if persona exists
    const existingPersona = await prisma.persona.findUnique({
      where: {
        id: personaId,
      },
    });

    if (!existingPersona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    // Check if persona is being used by any agents
    const agentsUsingPersona = await prisma.agent.findMany({
      where: {
        personaId,
      },
    });

    if (agentsUsingPersona.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete persona that is being used by agents',
        agentsUsingPersona
      }, { status: 400 });
    }

    // Delete persona (this will cascade delete examples due to the relation in the schema)
    await prisma.persona.delete({
      where: {
        id: personaId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting persona:', error);
    return NextResponse.json({ error: 'Failed to delete persona' }, { status: 500 });
  }
}
