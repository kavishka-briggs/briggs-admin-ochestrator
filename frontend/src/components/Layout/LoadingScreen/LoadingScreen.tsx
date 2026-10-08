import { Spinner } from '@briggs-walker/briggsdesignsystem';

const LoadingScreen = () => {
    return (
        <div className="w-full h-[100dvh] bg-layout-loader-bg flex justify-center items-center">
            <Spinner />
        </div>
    )
}

export default LoadingScreen;