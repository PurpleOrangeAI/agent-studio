import { errorResponse, jsonResponse, matchRoute } from '../http.js';
import type { ApiStore } from '../store.js';

export function handleWorkflowRoutes(pathname: string, store: ApiStore): Response | null {
  if (pathname === '/api/workflows') {
    return jsonResponse({
      workflows: store.listWorkflows(),
    });
  }

  const workflowParams = matchRoute('/api/workflows/:workflowId', pathname);
  if (workflowParams) {
    const workflow = store.getWorkflow(workflowParams.workflowId);

    return workflow
      ? jsonResponse({ workflow })
      : errorResponse(404, `Workflow ${workflowParams.workflowId} was not found.`);
  }

  const runParams = matchRoute('/api/workflows/:workflowId/runs', pathname);
  if (runParams) {
    const workflow = store.getWorkflow(runParams.workflowId);

    if (!workflow) {
      return errorResponse(404, `Workflow ${runParams.workflowId} was not found.`);
    }

    return jsonResponse({
      workflow,
      runs: store.listRunsByWorkflow(runParams.workflowId),
    });
  }

  return null;
}

