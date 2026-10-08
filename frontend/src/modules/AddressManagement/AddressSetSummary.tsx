import { Spinner } from "@briggs-walker/briggsdesignsystem";
import Layout from "../../components/Layout/Layout";
import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import { logger } from "../../utils/logging";

const AddressManagement_AddressSetSummary = () => {
    const { ADDRESS_MANAGEMENT_MODULE_REMOTE_URL } = useGetDynamicURL();

    logger('page_view', { page: 'AddressManagement-AddressSetSummary' });

    return (
        <Layout>
            <div className='py-0'>
                <RemoteComponentLoader
                    remoteUrl={ADDRESS_MANAGEMENT_MODULE_REMOTE_URL}
                    scope="AddressManagement"
                    modulePath="./AddressSetSummary"
                    fallback={
                        <div className='flex min-h-[40vh] items-center justify-center'>
                            <Spinner />
                        </div>
                    }
                />
            </div >
        </Layout>
    )
}

export default AddressManagement_AddressSetSummary;
