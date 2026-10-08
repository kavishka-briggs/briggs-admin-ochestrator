import React from 'react';
import './HorizontalLoadingIndicator.css';

interface HorizontalLoadingIndicatorProps {
    progress?: number;           // 0 - 100 for controlled progress
    indeterminate?: boolean;     // true for infinite loading
}

const HorizontalLoadingIndicator: React.FC<HorizontalLoadingIndicatorProps> = ({
    progress = 0,
    indeterminate = false,
}) => {
    return (
        <div className="w-full h-1 bg-gray-200 relative overflow-hidden rounded">
            {indeterminate ? (
                <div className="absolute top-0 left-0 h-full bg-blue-500 loading-animation"></div>
            ) : (
                <div
                    className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
                    style={{ width: `${progress}%` }}
                />
            )}
        </div>
    );
};

export default HorizontalLoadingIndicator;
