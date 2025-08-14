import styles from './graphy-footer.module.css';

export default function GraphyFooter() {
  return (
    <div className="min-h-screen w-full bg-black relative flex items-center justify-center">
      {/* Midnight Mist Background */}
      <div className={`absolute inset-0 z-0 ${styles.midnightMistBackground}`} />

      {/* Footer Content */}
      <footer className="relative z-10 bg-white rounded-2xl shadow p-10 w-full max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-black rounded flex items-center justify-center">
                <span className="text-white font-bold">≡</span>
              </div>
              <span className="font-semibold text-lg">Graphy</span>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Graphy empowers teams to transform raw data into clear, compelling 
              visuals — making insights easier to share, understand, and act on.
            </p>
            {/* Social icons */}
            <div className="flex space-x-4 text-gray-700 text-xl">
              <a href="#" title="Twitter" aria-label="Follow us on Twitter">
                <i className="fa-brands fa-x-twitter"></i>
              </a>
              <a href="#" title="Instagram" aria-label="Follow us on Instagram">
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a href="#" title="LinkedIn" aria-label="Connect with us on LinkedIn">
                <i className="fa-brands fa-linkedin"></i>
              </a>
              <a href="#" title="GitHub" aria-label="View our GitHub repository">
                <i className="fa-brands fa-github"></i>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-3">Product</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li><a href="#" className="hover:text-gray-800 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Integrations</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Changelog</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-3">Resources</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li><a href="#" className="hover:text-gray-800 transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Tutorials</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Support</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-gray-600 text-sm">
              <li><a href="#" className="hover:text-gray-800 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-gray-800 transition-colors">Partners</a></li>
            </ul>
          </div>
        </div>

        <hr className="my-6 border-gray-200" />

        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>© 2025 Graphy. All rights reserved.</p>
          <div className="flex space-x-6 mt-3 md:mt-0">
            <a href="#" className="hover:underline hover:text-gray-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:underline hover:text-gray-700 transition-colors">Terms of Service</a>
            <a href="#" className="hover:underline hover:text-gray-700 transition-colors">Cookies Settings</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
