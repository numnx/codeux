import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { AppDbStorage } from "../../../src/repositories/app-db-storage.js";
import { ConnectionChatRepository } from "../../../src/repositories/connection-chat-repository.js";
import { ProjectManagementRepository } from "../../../src/repositories/project-management-repository.js";

const tempDirs: string[] = [];

async function createRepositories(): Promise<{
  projectRepository: ProjectManagementRepository;
  connectionRepository: ConnectionChatRepository;
}> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "sprint-os-connection-repo-"));
  tempDirs.push(dir);
  const storage = new AppDbStorage(path.join(dir, "app.db"));
  return {
    projectRepository: new ProjectManagementRepository(storage),
    connectionRepository: new ConnectionChatRepository(storage),
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("ConnectionChatRepository", () => {
  it("registers listeners, queues dashboard messages, and stores replies", async () => {
    const { projectRepository, connectionRepository } = await createRepositories();
    const project = projectRepository.createProject({
      name: "Connection Project",
      sourceType: "local",
      sourceRef: "/workspace/connection-project",
    });
    projectRepository.setSelectedProjectId(project.id);

    const startListen = connectionRepository.startListen({
      connectionKey: "listener-alpha",
      displayName: "Listener Alpha",
      role: "listener",
      projectId: project.id,
      capabilities: {
        instruction: "Reply to dashboard messages.",
        model: "codex",
      },
    });

    expect(startListen.connection).toMatchObject({
      displayName: "Listener Alpha",
      role: "listener",
      status: "listening",
    });
    expect(startListen.inbox).toEqual([]);

    const posted = connectionRepository.postDashboardMessage(project.id, {
      title: "Triage blockers",
      bodyMarkdown: "Please summarize the top blockers for this project.",
    });

    const threads = connectionRepository.listThreads(project.id);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      title: "Triage blockers",
      pendingMessageCount: 1,
    });

    const inbox = connectionRepository.pullInbox({
      connectionKey: "listener-alpha",
      projectId: project.id,
    });
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      threadId: threads[0].id,
      bodyMarkdown: "Please summarize the top blockers for this project.",
      deliveryStatus: "delivered",
    });

    const reply = connectionRepository.postListenReply({
      connectionKey: "listener-alpha",
      threadId: threads[0].id,
      bodyMarkdown: "Current blockers are dependency ordering and one failed task run.",
      replyToMessageId: posted.id,
    });
    expect(reply).toMatchObject({
      direction: "connection_to_dashboard",
      authorType: "connection",
      deliveryStatus: "processed",
    });

    const messages = connectionRepository.listMessages(threads[0].id);
    expect(messages).toHaveLength(2);
    expect(messages[0].deliveryStatus).toBe("processed");
    expect(messages[1].bodyMarkdown).toContain("dependency ordering");

    const connections = connectionRepository.listConnections(project.id);
    expect(connections[0]).toMatchObject({
      pendingInboxCount: 0,
      threadCount: 1,
      messageCount: 2,
    });
  });
});
