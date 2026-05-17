"""Cloudinary upload helper."""
import cloudinary
import cloudinary.uploader
from core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


def upload_image(file, folder: str) -> dict:
    result = cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="image",
        allowed_formats=["jpg", "png", "jpeg", "webp", "gif"],
    )
    return {"public_id": result["public_id"], "url": result["secure_url"]}
