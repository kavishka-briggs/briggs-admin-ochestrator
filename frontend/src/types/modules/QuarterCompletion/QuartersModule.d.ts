declare module "QuarterCompletion/QuartersPage" {
    import { FC } from "react";

    interface AuthProps {
        onAuthStatus?: (status: any) => void;
    }

    const QuartersPage: FC<AuthProps>;

    export default QuartersPage;
}