import { useState } from 'react';
import Layout from '../../../components/Layout/Layout';
import RemoteComponentLoader from '../../../components/RemoteComponentLoader/RemoteComponentLoader';
import { useGetDynamicURL } from '../../../hooks/useGetDynamicURL';
import { logger } from '../../../utils/logging';

const Projects = () => {
    const { QUARTER_COMPLETION_MODULE_REMOTE_URL } = useGetDynamicURL();
    const [loading, setLoading] = useState<boolean>(true);

    logger('page_view', { page: 'QuarterCompletion-ProjectsPage' });

    return (
        <Layout
            loading={loading}>
            <div className='p-4'>
                <RemoteComponentLoader
                    remoteUrl={QUARTER_COMPLETION_MODULE_REMOTE_URL}
                    scope="QuarterCompletion"
                    modulePath="./ProjectsPage"
                    fallback={<></>}
                    onComponentLoad={() => setLoading(false)}
                />
            </div >
        </Layout>
    )
}

export default Projects;
