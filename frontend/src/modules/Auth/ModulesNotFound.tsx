import RemoteComponentLoader from "../../components/RemoteComponentLoader/RemoteComponentLoader";
import { useGetDynamicURL } from "../../hooks/useGetDynamicURL";
import { logger } from "../../utils/logging";

const ModulesNotFound = () => {
    const { AUTH_MODULE_REMOTE_URL } = useGetDynamicURL();

    logger('page_view', { page: 'ModulesNotFound' });

    return (
        <div className='p-0'>
            <RemoteComponentLoader
                remoteUrl={AUTH_MODULE_REMOTE_URL}
                scope="Auth"
                modulePath="./ModulesNotFoundModule"
                fallback={<></>}
            />
        </div >
    )
}

export default ModulesNotFound;
