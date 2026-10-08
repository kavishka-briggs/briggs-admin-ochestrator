declare module "QuarterCompletion/ProjectsPage" {
    import { FC } from "react";

    interface AuthProps {
        onAuthStatus?: (status: any) => void;
    }

    const ProjectsPage: FC<AuthProps>;

    export default ProjectsPage;
}