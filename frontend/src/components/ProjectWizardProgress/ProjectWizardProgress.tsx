import React from 'react';
import useNavigate from '../../hooks/useNavigate';
import useTranslation from '../../hooks/useTranslation.hooks';

const ProgressButton = (): React.ReactElement => {
    const {t} = useTranslation();
    const { navigate } = useNavigate();
    const progress = parseInt(localStorage.getItem('projectWizardProgress') ?? '0');
    const radius = 24;
    const stroke = 3;
    const normalizedRadius = radius - stroke;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <button
            className="flex items-center px-4 py-2 bg-project-completion-progress-bg text-white rounded-full shadow cursor-pointer hover:bg-green-800 transition"
            onClick={() => navigate('PROJECT_WIZARD')}
        >
            <div className="relative w-10 h-10 mr-3">
                <svg
                    height={radius * 2}
                    width={radius * 2}
                    className='relative bottom-1 right-1'
                >
                    <circle
                        stroke="#4fd1c5"
                        fill="#1f9d7b"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke="#ffffff"
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        transform={`rotate(-90 ${radius} ${radius})`}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                    {progress}%
                </div>
            </div>

            <span className="font-medium">{t('module_orchestrator.projectWizardProgress.completeSetup')}</span>

            <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                />
            </svg>
        </button>
    );
};

export default ProgressButton;
