"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserButton } from "@clerk/nextjs";
import {
  Loader2,
  Star,
  BarChart,
  Download,
  ChevronDown,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Agent {
  id: string;
  name: string;
  description?: string;
}

interface AgentAnalytics {
  id: string;
  name: string;
  description?: string;
  queryCount: number;
  responseTime: number | null;
  satisfactionScore: number | null;
  chatCount: number;
  messageCount: number;
  feedbackCount: number;
}

export default function CompareAnalyticsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<AgentAnalytics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);

  // Fetch all agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/agents");
        if (response.ok) {
          const data = await response.json();
          setAgents(data);
        } else {
          console.error("Failed to fetch agents");
        }
      } catch (error) {
        console.error("Error fetching agents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Handle agent selection
  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  // Compare selected agents
  const compareAgents = async () => {
    if (selectedAgents.length < 2) {
      alert("Please select at least 2 agents to compare");
      return;
    }

    try {
      setIsComparing(true);
      const response = await fetch(
        `/api/analytics/compare?agentIds=${selectedAgents.join(",")}`
      );
      if (response.ok) {
        const data = await response.json();
        setComparisonData(data);
      } else {
        console.error("Failed to compare agents");
      }
    } catch (error) {
      console.error("Error comparing agents:", error);
    } finally {
      setIsComparing(false);
    }
  };

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Link href="/">
                <h1 className="text-2xl font-bold">Agennt</h1>
              </Link>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <h1 className="text-2xl font-bold">Agennt</h1>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Compare Agents</h1>
          <div className="flex space-x-2">
            {comparisonData.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      window.open(
                        `/api/analytics/compare/export?agentIds=${selectedAgents.join(
                          ","
                        )}&format=csv`,
                        "_blank"
                      );
                    }}
                  >
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      window.open(
                        `/api/analytics/compare/export?agentIds=${selectedAgents.join(
                          ","
                        )}&format=json`,
                        "_blank"
                      );
                    }}
                  >
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Agents to Compare</CardTitle>
            <CardDescription>
              Choose at least two agents to compare their performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-4 border rounded-md cursor-pointer transition-colors ${
                    selectedAgents.includes(agent.id)
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-neutral-200 dark:border-neutral-800 hover:border-blue-300"
                  }`}
                  onClick={() => toggleAgentSelection(agent.id)}
                >
                  <h3 className="font-medium">{agent.name}</h3>
                  {agent.description && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                      {agent.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={compareAgents}
                disabled={selectedAgents.length < 2 || isComparing}
              >
                {isComparing ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Comparing...
                  </span>
                ) : (
                  "Compare Agents"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {comparisonData.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4">Comparison Results</h2>

            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-neutral-100 dark:bg-neutral-800">
                    <th className="p-3 text-left">Metric</th>
                    {comparisonData.map((agent) => (
                      <th key={agent.id} className="p-3 text-left">
                        {agent.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="p-3 font-medium">Total Queries</td>
                    {comparisonData.map((agent) => (
                      <td key={agent.id} className="p-3">
                        {formatNumber(agent.queryCount)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="p-3 font-medium">Avg. Response Time</td>
                    {comparisonData.map((agent) => (
                      <td key={agent.id} className="p-3">
                        {agent.responseTime
                          ? `${Math.round(agent.responseTime)}ms`
                          : "N/A"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="p-3 font-medium">Satisfaction Score</td>
                    {comparisonData.map((agent) => (
                      <td key={agent.id} className="p-3">
                        <div className="flex items-center">
                          {agent.satisfactionScore ? (
                            <>
                              {(
                                Math.round(agent.satisfactionScore * 10) / 10
                              ).toFixed(1)}
                              <div className="flex ml-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < Math.round(agent.satisfactionScore)
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-neutral-400"
                                    }`}
                                  />
                                ))}
                              </div>
                            </>
                          ) : (
                            "N/A"
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="p-3 font-medium">Total Chats</td>
                    {comparisonData.map((agent) => (
                      <td key={agent.id} className="p-3">
                        {formatNumber(agent.chatCount)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-neutral-200 dark:border-neutral-800">
                    <td className="p-3 font-medium">Total Messages</td>
                    {comparisonData.map((agent) => (
                      <td key={agent.id} className="p-3">
                        {formatNumber(agent.messageCount)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Feedback Received</td>
                    {comparisonData.map((agent) => (
                      <td key={agent.id} className="p-3">
                        {formatNumber(agent.feedbackCount)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Comparison</CardTitle>
                  <CardDescription>
                    Average time to respond to user queries
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {comparisonData.map((agent, index) => (
                      <div key={agent.id} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{agent.name}</span>
                          <span>
                            {agent.responseTime
                              ? `${Math.round(agent.responseTime)}ms`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full ${
                              [
                                "bg-blue-500",
                                "bg-green-500",
                                "bg-purple-500",
                                "bg-yellow-500",
                                "bg-red-500",
                              ][index % 5]
                            }`}
                            style={{
                              width: agent.responseTime
                                ? `${Math.min(
                                    (agent.responseTime / 1000) * 100,
                                    100
                                  )}%`
                                : "0%",
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Satisfaction Score Comparison</CardTitle>
                  <CardDescription>
                    Average user satisfaction rating
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {comparisonData.map((agent, index) => (
                      <div key={agent.id} className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{agent.name}</span>
                          <div className="flex items-center">
                            {agent.satisfactionScore ? (
                              <>
                                {(
                                  Math.round(agent.satisfactionScore * 10) / 10
                                ).toFixed(1)}
                                <div className="flex ml-2">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-3 w-3 ${
                                        i < Math.round(agent.satisfactionScore)
                                          ? "text-yellow-500 fill-yellow-500"
                                          : "text-neutral-400"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </>
                            ) : (
                              "N/A"
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full ${
                              [
                                "bg-blue-500",
                                "bg-green-500",
                                "bg-purple-500",
                                "bg-yellow-500",
                                "bg-red-500",
                              ][index % 5]
                            }`}
                            style={{
                              width: agent.satisfactionScore
                                ? `${(agent.satisfactionScore / 5) * 100}%`
                                : "0%",
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart className="h-5 w-5 mr-2" />
                    Message Volume Comparison
                  </CardTitle>
                  <CardDescription>
                    Total messages processed by each agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-end justify-around">
                    {comparisonData.map((agent, index) => (
                      <div
                        key={agent.id}
                        className="flex flex-col items-center"
                      >
                        <div
                          className={`w-16 ${
                            [
                              "bg-blue-500",
                              "bg-green-500",
                              "bg-purple-500",
                              "bg-yellow-500",
                              "bg-red-500",
                            ][index % 5]
                          } rounded-t-md`}
                          style={{
                            height: `${Math.min(
                              (agent.messageCount /
                                Math.max(
                                  ...comparisonData.map((a) => a.messageCount)
                                )) *
                                200,
                              200
                            )}px`,
                          }}
                        ></div>
                        <div className="mt-2 text-xs text-center font-medium">
                          {agent.name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {formatNumber(agent.messageCount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Feedback Distribution
                  </CardTitle>
                  <CardDescription>
                    Comparison of feedback received per agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    <div className="relative w-60 h-60">
                      {comparisonData.map((agent, index, array) => {
                        // Calculate the total feedback count across all agents
                        const totalFeedback = array.reduce(
                          (sum, a) => sum + a.feedbackCount,
                          0
                        );

                        // Calculate the percentage of feedback for this agent
                        const percentage =
                          totalFeedback > 0
                            ? (agent.feedbackCount / totalFeedback) * 100
                            : 0;

                        // Calculate the cumulative percentage up to this agent
                        const previousPercentage = array
                          .slice(0, index)
                          .reduce(
                            (sum, a) =>
                              sum + (a.feedbackCount / totalFeedback) * 100,
                            0
                          );

                        // Generate the SVG path for the pie slice
                        return (
                          <div key={agent.id} className="absolute inset-0">
                            <svg
                              width="100%"
                              height="100%"
                              viewBox="0 0 100 100"
                            >
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke={
                                  [
                                    "#3b82f6", // blue-500
                                    "#22c55e", // green-500
                                    "#a855f7", // purple-500
                                    "#eab308", // yellow-500
                                    "#ef4444", // red-500
                                  ][index % 5]
                                }
                                strokeWidth="20"
                                strokeDasharray={`${percentage * 2.51} ${
                                  100 * 2.51 - percentage * 2.51
                                }`}
                                strokeDashoffset={`${
                                  -previousPercentage * 2.51 + 25
                                }`}
                                transform="rotate(-90 50 50)"
                              />
                            </svg>
                          </div>
                        );
                      })}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {formatNumber(
                              comparisonData.reduce(
                                (sum, a) => sum + a.feedbackCount,
                                0
                              )
                            )}
                          </div>
                          <div className="text-xs text-neutral-500">
                            Total Feedback
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {comparisonData.map((agent, index) => (
                      <div key={agent.id} className="flex items-center">
                        <div
                          className={`w-3 h-3 rounded-full mr-1 ${
                            [
                              "bg-blue-500",
                              "bg-green-500",
                              "bg-purple-500",
                              "bg-yellow-500",
                              "bg-red-500",
                            ][index % 5]
                          }`}
                        ></div>
                        <span className="text-xs">
                          {agent.name} ({agent.feedbackCount})
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Performance Metrics Radar Chart
                </CardTitle>
                <CardDescription>
                  Comparative view of key performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 flex items-center justify-center">
                  <div className="relative w-80 h-80">
                    {/* Radar chart background */}
                    <svg width="100%" height="100%" viewBox="0 0 100 100">
                      {/* Background circles */}
                      <circle
                        cx="50"
                        cy="50"
                        r="10"
                        fill="transparent"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="20"
                        fill="transparent"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="30"
                        fill="transparent"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />

                      {/* Axis lines */}
                      <line
                        x1="50"
                        y1="10"
                        x2="50"
                        y2="90"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="10"
                        y1="50"
                        x2="90"
                        y2="50"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="25"
                        y1="25"
                        x2="75"
                        y2="75"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />
                      <line
                        x1="25"
                        y1="75"
                        x2="75"
                        y2="25"
                        stroke="#e5e5e5"
                        strokeWidth="0.5"
                      />

                      {/* Axis labels */}
                      <text
                        x="50"
                        y="5"
                        textAnchor="middle"
                        fontSize="3"
                        fill="currentColor"
                      >
                        Response Time
                      </text>
                      <text
                        x="95"
                        y="50"
                        textAnchor="end"
                        fontSize="3"
                        fill="currentColor"
                      >
                        Satisfaction
                      </text>
                      <text
                        x="50"
                        y="97"
                        textAnchor="middle"
                        fontSize="3"
                        fill="currentColor"
                      >
                        Query Volume
                      </text>
                      <text
                        x="5"
                        y="50"
                        textAnchor="start"
                        fontSize="3"
                        fill="currentColor"
                      >
                        Feedback
                      </text>
                      <text
                        x="75"
                        y="25"
                        textAnchor="middle"
                        fontSize="3"
                        fill="currentColor"
                      >
                        Messages
                      </text>
                      <text
                        x="25"
                        y="75"
                        textAnchor="middle"
                        fontSize="3"
                        fill="currentColor"
                      >
                        Chats
                      </text>
                    </svg>

                    {/* Agent data plots */}
                    {comparisonData.map((agent, index) => {
                      // Normalize values to 0-40 scale for plotting
                      const maxResponseTime = Math.max(
                        ...comparisonData.map((a) => a.responseTime || 0)
                      );
                      const maxQueryCount = Math.max(
                        ...comparisonData.map((a) => a.queryCount)
                      );
                      const maxFeedbackCount = Math.max(
                        ...comparisonData.map((a) => a.feedbackCount)
                      );
                      const maxMessageCount = Math.max(
                        ...comparisonData.map((a) => a.messageCount)
                      );
                      const maxChatCount = Math.max(
                        ...comparisonData.map((a) => a.chatCount)
                      );

                      // Calculate normalized values (inverted for response time - lower is better)
                      const responseTimeNorm =
                        maxResponseTime > 0
                          ? 40 -
                            ((agent.responseTime || 0) / maxResponseTime) * 40
                          : 20;
                      const satisfactionNorm =
                        (agent.satisfactionScore || 0) * 8; // 0-5 scale to 0-40
                      const queryCountNorm =
                        maxQueryCount > 0
                          ? (agent.queryCount / maxQueryCount) * 40
                          : 0;
                      const feedbackCountNorm =
                        maxFeedbackCount > 0
                          ? (agent.feedbackCount / maxFeedbackCount) * 40
                          : 0;
                      const messageCountNorm =
                        maxMessageCount > 0
                          ? (agent.messageCount / maxMessageCount) * 40
                          : 0;
                      const chatCountNorm =
                        maxChatCount > 0
                          ? (agent.chatCount / maxChatCount) * 40
                          : 0;

                      // Calculate points for the polygon
                      const points = [
                        [50, 50 - responseTimeNorm], // Response Time (top)
                        [
                          50 + satisfactionNorm * 0.707,
                          50 - satisfactionNorm * 0.707,
                        ], // Satisfaction (top-right)
                        [50 + queryCountNorm, 50], // Query Volume (right)
                        [
                          50 + feedbackCountNorm * 0.707,
                          50 + feedbackCountNorm * 0.707,
                        ], // Feedback (bottom-right)
                        [50, 50 + messageCountNorm], // Messages (bottom)
                        [
                          50 - chatCountNorm * 0.707,
                          50 + chatCountNorm * 0.707,
                        ], // Chats (bottom-left)
                      ];

                      return (
                        <svg
                          key={agent.id}
                          width="100%"
                          height="100%"
                          viewBox="0 0 100 100"
                          className="absolute inset-0"
                        >
                          <polygon
                            points={points.map((p) => p.join(",")).join(" ")}
                            fill={
                              [
                                "rgba(59, 130, 246, 0.2)", // blue-500
                                "rgba(34, 197, 94, 0.2)", // green-500
                                "rgba(168, 85, 247, 0.2)", // purple-500
                                "rgba(234, 179, 8, 0.2)", // yellow-500
                                "rgba(239, 68, 68, 0.2)", // red-500
                              ][index % 5]
                            }
                            stroke={
                              [
                                "#3b82f6", // blue-500
                                "#22c55e", // green-500
                                "#a855f7", // purple-500
                                "#eab308", // yellow-500
                                "#ef4444", // red-500
                              ][index % 5]
                            }
                            strokeWidth="0.5"
                          />

                          {/* Add dots at each point */}
                          {points.map((point, i) => (
                            <circle
                              key={i}
                              cx={point[0]}
                              cy={point[1]}
                              r="1"
                              fill={
                                [
                                  "#3b82f6", // blue-500
                                  "#22c55e", // green-500
                                  "#a855f7", // purple-500
                                  "#eab308", // yellow-500
                                  "#ef4444", // red-500
                                ][index % 5]
                              }
                            />
                          ))}
                        </svg>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {comparisonData.map((agent, index) => (
                    <div key={agent.id} className="flex items-center">
                      <div
                        className={`w-3 h-3 rounded-full mr-1 ${
                          [
                            "bg-blue-500",
                            "bg-green-500",
                            "bg-purple-500",
                            "bg-yellow-500",
                            "bg-red-500",
                          ][index % 5]
                        }`}
                      ></div>
                      <span className="text-xs">{agent.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 px-4">
        <div className="container mx-auto text-center text-sm text-neutral-600 dark:text-neutral-400">
          &copy; {new Date().getFullYear()} Agennt. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
