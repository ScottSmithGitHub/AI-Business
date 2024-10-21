"use client";
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    SetStateAction,
  } from "react";

  import { BusinessState } from "@/utils/types/business";
  import { useClerk, useUser } from "@clerk/nextjs";
  import { saveBusinessToDb,getBusinessFromDb, getUserBusinessesFromDb } from "@/actions/business";
  import {handleLogoAction} from "@/actions/coudinary";
  import toast from "react-hot-toast";
  import { useRouter, usePathname, useParams } from "next/navigation";

  const initialState: BusinessState = {
    _id: "",
    userEmail: "",
    name: "",
    category: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    hours: "",
    logo: "",
    abn: "",
    slug: "",
    createdAt: "",
    updatedAt: "",
    __v: 0,
  };

  interface BusinessContextType {
    business: BusinessState;
    setBusiness: React.Dispatch<React.SetStateAction<BusinessState>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    businesses: BusinessState[];
    setBusinesses: React.Dispatch<React.SetStateAction<BusinessState[]>>;
    initialState: BusinessState;
    logoUploading: boolean;
   };

  const BusinessContext = createContext<BusinessContextType | undefined>(
    undefined
  );

  export const BusinessProvider: React.FC<{children: ReactNode}> = ({ 
    children
}) => {
    // state
    const [business, setBusiness] = useState<BusinessState>(initialState);
    const [loading, setLoading] = useState<boolean>(false);
    const [businesses, setBusinesses] = useState<BusinessState[]>([]);

    // loading state
    const [logoUploading, setLogoUploading] = useState<boolean>(false);

    // hooks
    const { openSignIn } = useClerk();
    const { isSignedIn } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const { _id } = useParams();

    const isDashboardPage = pathname === "/dashboard";
    const isEditPage = pathname.includes("/edit");

    useEffect(() => {
        const savedBusiness = localStorage.getItem("business");
        if (savedBusiness) {
          setBusiness(JSON.parse(savedBusiness));
        }
      }, []);

    useEffect(() => {
      if (isDashboardPage) {
        getUserBusinesses();
      }
    }, [isDashboardPage]);

    useEffect(() => {
      if (_id) {
      getBusiness();
      }
     }, [_id]);


    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, files } = e.target;

        if(name === "logo" && files && files[0]) {
          await handleLogo(files, name);          
        } else {
          setBusiness((prevBusiness: BusinessState) => {
            const updatedBusiness = { ...prevBusiness, [name]: value };
    
            // save to local storage
            localStorage.setItem("business", JSON.stringify(updatedBusiness));
    
            return updatedBusiness;
          });
        }
    };

    const handleLogo = async (files: FileList, name: string) => {
      const file = files[0];
      setLogoUploading(true);
  
      // convert image to base64
      const reader = new FileReader();
  
      return new Promise<void>((resolve, reject) => {
        reader.onloadend = async () => {
          const base64Image = reader.result as string;
  
          try {
            const imageUrl = await handleLogoAction(base64Image);
  
            if (imageUrl) {
              setBusiness((prevBusiness) => {
                const updatedBusiness = { ...prevBusiness, [name]: imageUrl };
  
                // save to local storage
                localStorage.setItem("business", JSON.stringify(updatedBusiness));
  
                return updatedBusiness;
              });
  
              resolve();
            } else {
              toast.error("❌ Failed to upload logo");
            }
          } catch (err: any) {
            console.error(err);
            toast.error("❌ Failed to upload logo");
          } finally {
            setLogoUploading(false);
          }
        };
  
        reader.onerror = (error) => {
          toast.error("❌ Failed to upload image");
          reject(error);
        };
  
        reader.readAsDataURL(file);
      });

    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isSignedIn) {
          openSignIn();
          return;
      } else {
        try {
          setLoading(true);
          const savedBusiness = await saveBusinessToDb(business);
          setBusiness(savedBusiness);
          // clear local storage
          localStorage.removeItem('business');
          // notify user
          toast.success("🎉 Business saved successfully");
          // redirect to edit page
          router.push(`/dashboard/business/edit/${savedBusiness._id}`);
        } catch (err) {
          console.log(err);
          toast.error("❌ Failed to save business.");
        } finally {
          setLoading(false);
        }
      }        
    };

    const getUserBusinesses = async () => {
      setLoading(true);

      try {
        const businesses = await getUserBusinessesFromDb();
        setBusinesses(businesses);                
      } catch (err) {
        console.log(err);
          toast.error("❌ Failed to save business.");
      } finally {
        setLoading(false);
      }
    }

    const getBusiness = async () => {
      try {
        const business = await getBusinessFromDb(_id.toString());
        setBusiness(business);
      } catch (err: any) {
        console.error(err);
        toast.error("❌ Failed to fetch business");
      }
    };

    return (
        <BusinessContext.Provider
          value={{
            business,
            setBusiness,
            loading,
            setLoading,
            handleChange,
            handleSubmit,
            businesses,
            setBusinesses,
            initialState,
            logoUploading
          }}
        >
          {children}
        </BusinessContext.Provider>
      );
  };

// Allows use of context in other areas of app
export const useBusiness = () => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
      throw new Error("useBusiness must be used within a BusinessProvider");
    }
    return context;
  };