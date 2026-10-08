import { useState } from "react";
import Layout from "../../components/Layout/Layout";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";

const ProjectsWizard = () => {
    const { PROJECT_WIZARD_MODULE_REMOTE_URL } = useGetDynamicURL();
    const [loading, setLoading] = useState<boolean>(true);

    return (
        <Layout
            loading={loading}>
            <div className='py-4'>
                <RemoteComponentLoader
                    remoteUrl={PROJECT_WIZARD_MODULE_REMOTE_URL}
                    scope="ProjectWizard"
                    modulePath="./OnboardingPage"
                    fallback={<></>}
                    onComponentLoad={() => setLoading(false)}
                />
            </div >
        </Layout>
    )
}

export default ProjectsWizard;
