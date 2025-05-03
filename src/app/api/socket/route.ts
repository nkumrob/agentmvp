import { NextResponse } from "next/server";
import { Server } from "socket.io";
import { getAuth } from "@clerk/nextjs/server";

// Global variable to store the Socket.IO server instance
let io: Server;

export async function GET(req: Request) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a new Socket.IO server if it doesn't exist
    if (!io) {
      // @ts-ignore - NextJS doesn't have a proper type for the global server
      io = new Server((global as any).__server, {
        path: "/api/socket",
        addTrailingSlash: false,
      });

      // Store the io instance globally for other routes to use
      (global as any).__io = io;

      io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        // Join a room for the user
        socket.on("join", (agentId: string) => {
          socket.join(`agent:${agentId}`);
          console.log(`Socket ${socket.id} joined room agent:${agentId}`);
        });

        socket.on("disconnect", () => {
          console.log("Client disconnected:", socket.id);
        });
      });
    }

    return new NextResponse("WebSocket server is running", {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    console.error("Error setting up WebSocket server:", error);
    return NextResponse.json(
      { error: "Failed to set up WebSocket server" },
      { status: 500 }
    );
  }
}
