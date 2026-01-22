import Header from './Header'
import MobileNav from './MobileNav'

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container pt-24 pb-24 md:pb-12">
                {children}
            </main>
            <MobileNav />
        </div>
    )
}

export default Layout
