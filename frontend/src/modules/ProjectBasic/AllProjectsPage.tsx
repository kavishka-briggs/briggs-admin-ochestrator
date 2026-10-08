import { useState } from "react";
import Layout from "../../components/Layout/Layout";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import { logger } from "../../utils/logging";

const AllProjectsPage = () => {
    const { PROJECT_BASIC_MODULE_REMOTE_URL } = useGetDynamicURL();
    const [loading, setLoading] = useState<boolean>(true);

    logger('page_view', { page: 'ProjectsBasic_AllProjects' });

    return (
        <Layout
            loading={loading}>
            <div className='py-4'>
                <RemoteComponentLoader
                    remoteUrl={PROJECT_BASIC_MODULE_REMOTE_URL}
                    scope="ProjectBasic"
                    modulePath="./AllProjectsPage"
                    fallback={<></>}
                    onComponentLoad={() => setLoading(false)}
                />
            </div >
        </Layout>
    )
}

export default AllProjectsPage;
