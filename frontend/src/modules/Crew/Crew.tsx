import { useState } from "react";
import Layout from "../../components/Layout/Layout";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import { logger } from "../../utils/logging";

const Crew = () => {
    const { CREW_BASIC_MODULE_REMOTE_URL } = useGetDynamicURL();
    const [loading, setLoading] = useState<boolean>(true);

    logger('page_view', { page: 'Crew' });

    return (
        <Layout
            loading={loading}>
            <div className='py-4'>
                <RemoteComponentLoader
                    remoteUrl={CREW_BASIC_MODULE_REMOTE_URL}
                    scope="BasicCrew"
                    modulePath="./CrewPage"
                    fallback={<></>}
                    onComponentLoad={() => setLoading(false)}
                />
            </div >
        </Layout>
    )
}

export default Crew;
