import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { prisma } from '@/server/db/client';

export async function GET(
  req: Request,
  { params }: { params: { id: string; exampleId: string } }
) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personaId = params?.id;
    const exampleId = params?.exampleId;
    
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    if (!exampleId) {
      return NextResponse.json({ error: 'Example ID is required' }, { status: 400 });
    }

    // Get example
    const example = await prisma.example.findUnique({
      where: {
        id: exampleId,
      },
      include: {
        persona: true,
      },
    });

    if (!example) {
      return NextResponse.json({ error: 'Example not found' }, { status: 404 });
    }

    if (example.personaId !== personaId) {
      return NextResponse.json({ error: 'Example does not belong to this persona' }, { status: 400 });
    }

    return NextResponse.json(example);
  } catch (error) {
    console.error('Error fetching example:', error);
    return NextResponse.json({ error: 'Failed to fetch example' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string; exampleId: string } }
) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personaId = params?.id;
    const exampleId = params?.exampleId;
    
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    if (!exampleId) {
      return NextResponse.json({ error: 'Example ID is required' }, { status: 400 });
    }

    // Check if example exists and belongs to persona
    const existingExample = await prisma.example.findUnique({
      where: {
        id: exampleId,
      },
    });

    if (!existingExample) {
      return NextResponse.json({ error: 'Example not found' }, { status: 404 });
    }

    if (existingExample.personaId !== personaId) {
      return NextResponse.json({ error: 'Example does not belong to this persona' }, { status: 400 });
    }

    const body = await req.json();
    const { prompt, response, tags } = body;

    // Update example
    const updatedExample = await prisma.example.update({
      where: {
        id: exampleId,
      },
      data: {
        prompt: prompt !== undefined ? prompt : undefined,
        response: response !== undefined ? response : undefined,
        tags: tags !== undefined ? tags.join(',') : undefined,
      },
    });

    return NextResponse.json(updatedExample);
  } catch (error) {
    console.error('Error updating example:', error);
    return NextResponse.json({ error: 'Failed to update example' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; exampleId: string } }
) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const personaId = params?.id;
    const exampleId = params?.exampleId;
    
    if (!personaId) {
      return NextResponse.json({ error: 'Persona ID is required' }, { status: 400 });
    }

    if (!exampleId) {
      return NextResponse.json({ error: 'Example ID is required' }, { status: 400 });
    }

    // Check if example exists and belongs to persona
    const existingExample = await prisma.example.findUnique({
      where: {
        id: exampleId,
      },
    });

    if (!existingExample) {
      return NextResponse.json({ error: 'Example not found' }, { status: 404 });
    }

    if (existingExample.personaId !== personaId) {
      return NextResponse.json({ error: 'Example does not belong to this persona' }, { status: 400 });
    }

    // Delete example
    await prisma.example.delete({
      where: {
        id: exampleId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting example:', error);
    return NextResponse.json({ error: 'Failed to delete example' }, { status: 500 });
  }
}
