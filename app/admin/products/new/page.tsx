import AdminProductForm from "@/components/AdminProductForm";

export default function NewProductPage() {
    return (
        <div className="p-8">
            <AdminProductForm isNew={true} />
        </div>
    );
}