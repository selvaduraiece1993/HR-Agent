'use client';
import React from 'react';
import { useUser } from '@/app/provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Plus, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

function CreditsDisplay() {
  const { user } = useUser();
  const router = useRouter();

  const handleBuyCredits = () => {
    // Navigate to pricing/buy credits page
    router.push('/recruiter/billing');
  };

  return (
    <div className="mb-6">
      <Card className="border-amber-200 bg-linear-to-r from-teal-50 to-teal-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-teal-800">
            <Coins className="w-5 h-5" />
            Interview Credits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-600">
                  {user?.credits || 0}
                </div>
                <div className="text-sm text-teal-600 font-medium">
                  Credits Remaining
                </div>
              </div>

              <div className="text-sm text-gray-600 max-w-md">
                <p className="mb-2">
                  Each interview creation costs <strong>1 credit</strong>. You
                  can create up to{' '}
                  <strong>{user?.credits || 0} more interviews</strong>.
                </p>
                {user?.credits <= 2 && (
                  <div className="flex items-center gap-2 text-teal-600 bg-teal-50 p-2 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">
                      {user?.credits === 0
                        ? 'No credits remaining. Purchase more to continue creating interviews.'
                        : user?.credits === 1
                          ? 'Only 1 credit remaining. Consider purchasing more credits.'
                          : 'Low credits remaining. Consider purchasing more credits.'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Button
              onClick={handleBuyCredits}
              className="bg-teal-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Buy Credits
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreditsDisplay;
