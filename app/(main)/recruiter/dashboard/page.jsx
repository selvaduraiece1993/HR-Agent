// 'React' import not required and WelcomeContainer unused in this file
'use client';
import CreateOptions from './_components/CreateOptions';
import LatestInterviewsList from './_components/LatestInterviewsList';
import CreditsDisplay from './_components/CreditsDisplay';

function Dashboard() {
  return (
    <div>
      {/* {<WelcomeContainer /> */}
      <h2 className="my-3 font-bold text-2xl">Dashboard</h2>
      <CreditsDisplay />
      <CreateOptions />
      <LatestInterviewsList />
    </div>
  );
}

export default Dashboard;
