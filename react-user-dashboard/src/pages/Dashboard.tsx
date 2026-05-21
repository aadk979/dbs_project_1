import { useEffect, useState } from 'react';
import { api } from '../api';
import { TopNav } from '../components/TopNav';
import { Card } from '../components/Card';
import { BadgePill } from '../components/BadgePill';
import { Button } from '../components/Button';

export function Dashboard() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await api.listUserOrgs();
        setOrgs(res.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load organizations');
      } finally {
        setLoading(false);
      }
    };
    fetchOrgs();
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />
      
      <main className="w-full max-w-[1200px] mx-auto px-lg py-[96px]">
        <div className="flex justify-between items-end mb-xl">
          <div>
            <h1 className="text-display-lg text-ink mb-2">Organizations</h1>
            <p className="text-body-md text-muted">Manage your teams and events</p>
          </div>
          <Button>Create organization</Button>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 text-error rounded-md text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-muted">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {orgs.length === 0 ? (
              <div className="col-span-full p-8 text-center border border-hairline rounded-lg bg-surface-soft">
                <p className="text-body-md text-muted mb-4">You aren't a member of any organizations yet.</p>
                <Button variant="secondary">Join an organization</Button>
              </div>
            ) : (
              orgs.map((orgMember) => (
                <Card key={orgMember.organization_id} variant="feature" className="flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-title-md text-ink">{orgMember.organization_name}</h3>
                    <BadgePill color={orgMember.role === 'admin' ? 'orange' : 'surface-card'}>
                      {orgMember.role}
                    </BadgePill>
                  </div>
                  <div className="text-body-sm text-muted mt-auto pt-6 border-t border-hairline">
                    Joined {new Date(orgMember.joined_at).toLocaleDateString()}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
