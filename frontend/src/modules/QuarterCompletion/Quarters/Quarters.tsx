import { useState } from 'react';
import Layout from '../../../components/Layout/Layout';
import RemoteComponentLoader from '../../../components/RemoteComponentLoader/RemoteComponentLoader';
import { useGetDynamicURL } from '../../../hooks/useGetDynamicURL';
import { logger } from '../../../utils/logging';

const Quarters = () => {
    const { QUARTER_COMPLETION_MODULE_REMOTE_URL } = useGetDynamicURL();
    const [loading, setLoading] = useState<boolean>(true);

    logger('page_view', { page: 'QuarterCompletion-QuartersPage' });

    return (
        <Layout
            loading={loading}>
            <div className='pt-4'>
                <RemoteComponentLoader
                    remoteUrl={QUARTER_COMPLETION_MODULE_REMOTE_URL}
                    scope="QuarterCompletion"
                    modulePath="./QuartersPage"
                    fallback={<></>}
                    onComponentLoad={() => setLoading(false)}
                />
            </div>
        </Layout>
    )
}

export default Quarters;
