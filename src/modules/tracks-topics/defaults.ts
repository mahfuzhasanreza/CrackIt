/**
 * Starter tracks and roadmap topics created for every new user.
 * Pure data — the seeding logic lives in prisma/seed-defaults.ts.
 */
export type DefaultTopic = { name: string; children?: DefaultTopic[] };

export type DefaultTrack = {
  name: string;
  description: string;
  color: string;
  weeklyTargetMinutes: number;
  topics: DefaultTopic[];
};

const leaves = (...names: string[]): DefaultTopic[] => names.map((name) => ({ name }));

export const DEFAULT_TRACKS: DefaultTrack[] = [
  {
    name: "SWE / Full-Stack",
    description: "Software engineer and full-stack developer interviews",
    color: "#2a78d6", // palette slot 1 (blue)
    weeklyTargetMinutes: 20 * 60,
    topics: [
      {
        name: "Data Structures & Algorithms",
        children: leaves(
          "Arrays & Hashing",
          "Two Pointers & Sliding Window",
          "Stack & Queue",
          "Binary Search",
          "Linked List",
          "Trees & BST",
          "Heap / Priority Queue",
          "Graphs (BFS, DFS, Topological Sort)",
          "Shortest Paths & MST",
          "Backtracking",
          "Dynamic Programming",
          "Greedy & Intervals",
          "Tries",
          "Bit Manipulation & Math",
        ),
      },
      {
        name: "System Design",
        children: leaves(
          "Fundamentals (scaling, CAP, consistency)",
          "Caching & CDNs",
          "Databases, Indexing & Sharding",
          "Message Queues & Async Processing",
          "API Design (REST, GraphQL, gRPC)",
          "Case Studies",
        ),
      },
      {
        name: "JavaScript & TypeScript",
        children: leaves("Event Loop & Async", "Closures, Scope & this", "TypeScript Types"),
      },
      {
        name: "Frontend (React / Next.js)",
        children: leaves(
          "React Internals & Hooks",
          "State Management",
          "Next.js App Router",
          "Performance & Web Vitals",
        ),
      },
      {
        name: "Backend (Node.js)",
        children: leaves("HTTP & REST", "Authentication & Security", "Testing", "Caching & Queues"),
      },
      {
        name: "Databases (SQL & NoSQL)",
        children: leaves(
          "SQL Queries & Joins",
          "Transactions & Isolation",
          "Indexes & Query Plans",
        ),
      },
      {
        name: "CS Fundamentals",
        children: leaves("Operating Systems", "Computer Networks", "OOP & Design Patterns"),
      },
      { name: "DevOps", children: leaves("Docker", "CI/CD", "Cloud Basics") },
      {
        name: "Behavioral & HR",
        children: leaves("STAR Stories", "Project Deep-Dives", "Salary Negotiation"),
      },
    ],
  },
  {
    name: "University Lecturer",
    description: "Lecturer recruitment: subject depth, teaching demo, research, viva",
    color: "#eb6834", // palette slot 2 (orange)
    weeklyTargetMinutes: 10 * 60,
    topics: [
      {
        name: "Subject Knowledge",
        children: leaves("Core CS Courses Revision", "Advanced Topics"),
      },
      {
        name: "Teaching Demo",
        children: leaves("Lesson Planning", "Slide Preparation", "Mock Demo Practice"),
      },
      {
        name: "Research & Publications",
        children: leaves("Thesis Summary", "Paper Writing", "Research Proposal"),
      },
      {
        name: "Viva / Board Questions",
        children: leaves("Teaching Philosophy", "Subject Questions", "General & Current Affairs"),
      },
      { name: "Written Test Preparation" },
      {
        name: "Application Documents",
        children: leaves("Academic CV", "Teaching Statement", "Research Statement"),
      },
    ],
  },
];
