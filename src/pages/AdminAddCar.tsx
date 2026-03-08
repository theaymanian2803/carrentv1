import Navbar from '@/components/Navbar';
import AddCarForm from '@/components/owner/AddCarForm';

const AdminAddCar = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Add New Listing</h1>
        <AddCarForm backPath="/admin" defaultStatus="live" />
      </div>
    </div>
  );
};

export default AdminAddCar;
