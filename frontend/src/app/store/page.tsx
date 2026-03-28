'use client';
import StoreDashboard from '../../components/StoreDashboard';
import { useLanguage } from '../../context/LanguageContext';

export default function Page() {
    const { t } = useLanguage(); 
    return <StoreDashboard />; 
}
