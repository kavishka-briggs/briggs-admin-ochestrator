import { apiClient } from "../utils/apiClient";

interface Project {
    domainCode: string;
    projectCode: string;
    projectName: string;
}

const getActivePlugins = async () => {
    const response = await apiClient().get(`/api/plugins/active`);
    return response.data.plugins as { id: string, gateway_path: string, plugin_index: number }[];
}

const getProjectInfo = async (domainCode: string): Promise<number> => {
    try {
        const { data } = await apiClient().get<{ projects: Project[] }>(
            "/api/projects",
            { params: { domainCode } }
        );
        return data.projects.length;
    } catch (error: any) {
        console.error("Error fetching project info:", error);
        if (error.response.data.code === "NoAssignedDomainProjects") {
            return -1;
        }
        return 0;
    }
};

export {
    getActivePlugins,
    getProjectInfo
};