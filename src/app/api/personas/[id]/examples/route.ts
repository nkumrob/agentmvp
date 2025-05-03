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

    // Get examples for persona
    const examples = await prisma.example.findMany({
      where: {
        personaId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(examples);
  } catch (error) {
    console.error('Error fetching examples:', error);
    return NextResponse.json({ error: 'Failed to fetch examples' }, { status: 500 });
  }
}

export async function POST(
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
    const persona = await prisma.persona.findUnique({
      where: {
        id: personaId,
      },
    });

    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }

    const body = await req.json();
    const { prompt, response, tags } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!response) {
      return NextResponse.json({ error: 'Response is required' }, { status: 400 });
    }

    // Create example
    const example = await prisma.example.create({
      data: {
        prompt,
        response,
        personaId,
        tags: tags ? tags.join(',') : '',
      },
    });

    return NextResponse.json(example);
  } catch (error) {
    console.error('Error creating example:', error);
    return NextResponse.json({ error: 'Failed to create example' }, { status: 500 });
  }
}
