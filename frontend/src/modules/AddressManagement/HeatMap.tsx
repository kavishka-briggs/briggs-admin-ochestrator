import { useState } from "react";
import Layout from "../../components/Layout/Layout";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import { logger } from "../../utils/logging";

const AddressManagement_HeatMap = () => {
    const { ADDRESS_MANAGEMENT_MODULE_REMOTE_URL } = useGetDynamicURL();
    const [loading, setLoading] = useState<boolean>(true);

    logger('page_view', { page: 'AddressManagement-HeatMap' });

    return (
        <Layout
            loading={loading}>
            <div className='py-0'>
                <RemoteComponentLoader
                    remoteUrl={ADDRESS_MANAGEMENT_MODULE_REMOTE_URL}
                    scope="AddressManagement"
                    modulePath="./HeatMap"
                    fallback={<></>}
                    onComponentLoad={() => setLoading(false)}
                />
            </div >
        </Layout>
    )
}

export default AddressManagement_HeatMap;
