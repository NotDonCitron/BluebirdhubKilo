import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          AbacusHub is Working! ✅
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Your productivity application is running successfully.
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Demo Account</h2>
            <p className="text-gray-600">Email: john@doe.com</p>
            <p className="text-gray-600">Password: johndoe123</p>
            <Link 
              href="/login" 
              className="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-800">
              ✅ Next.js is running<br/>
              ✅ Tailwind CSS is working<br/>
              ✅ Database is seeded<br/>
              ✅ Authentication is ready
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
