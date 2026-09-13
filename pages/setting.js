import React from 'react';

import Layout from 'components/Layout';
import SettingForm from 'components/Layout/SettingForm';
import SEO from 'components/SEO';
import { formatMessage } from 'utils/i18n';

const SettingPage = function () {
    const title = formatMessage('tThemeSetting');

    return (
        <Layout title={formatMessage('title')} breadcrumbs={[{ text: title }]}>
            <SEO title={title} />
            {/* The page heading lives inside SettingForm, next to its intro copy. */}
            <SettingForm />
        </Layout>
    );
};

export default SettingPage;
