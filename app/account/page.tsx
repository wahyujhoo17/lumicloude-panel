import { requireAuth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import ImageUpload from "@/components/image-upload";
import LinkHestiaClient from "@/components/link-hestia-client";

export default async function AccountPage() {
  const user = await requireAuth();

  const res = await fetch(
    `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/customers/me`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-2xl w-full p-8 bg-white rounded-xl shadow">
          <h2 className="text-xl font-semibold">Customer account</h2>
          <p className="mt-4 text-gray-600">
            No customer record found for your account. Please contact support or
            your administrator.
          </p>
        </div>
      </div>
    );
  }

  const json = await res.json();
  const customer = json.data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h1 className="text-2xl font-bold">
            Welcome, {customer.name || user.email}
          </h1>
          <p className="text-gray-600 mt-2">
            This is your LumiCloud customer panel. You can upload static site
            files here — uploads are stored and served by LumiCloud (no
            Hestia/aaPanel required for static sites).
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700">
                Your websites
              </h3>
              {customer.websites.length === 0 ? (
                <div className="mt-4 text-gray-500">
                  No websites yet. Ask your admin to create a subdomain or
                  upload a site below.
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {customer.websites.map((w: any) => (
                    <li key={w.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{w.subdomain}</p>
                          <p className="text-sm text-gray-500">
                            {w.customDomain || "—"}
                          </p>
                        </div>
                        <div className="text-sm text-gray-600">
                          Status: {w.status}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                Upload site (static)
              </h3>
              <p className="text-sm text-gray-500 mb-3">
                Upload images, logos, or static files for your site. Use the
                site uploader to provide files for your subdomain.
              </p>

              <div className="bg-white p-4 rounded-lg border">
                <ImageUpload
                  type="customer"
                  onUploadSuccess={(url: string) =>
                    alert(`Uploaded: ${url} — refresh page to see changes`)
                  }
                />
                <p className="text-xs text-gray-400 mt-3">
                  Tip: choose type = <code>customer</code> when uploading site
                  assets.
                </p>
              </div>

              <div className="mt-4">
                <LinkHestiaClient existingUsername={customer.hestiaUsername} />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold">Help & next steps</h3>
          <ul className="mt-4 space-y-2 text-gray-600">
            <li>
              • To map a custom domain, follow the DNS instructions in the guide
              or contact support.
            </li>
            <li>
              • To publish a full static site, upload your files to{" "}
              <code>
                uploads/customers/{customer.hestiaUsername || customer.id}
              </code>
              .
            </li>
            <li>
              • For dynamic/PHP sites you still need Hestia/aaPanel
              (admin-managed).
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
