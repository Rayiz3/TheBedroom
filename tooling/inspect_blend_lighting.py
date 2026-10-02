import json
import os

import bpy
from mathutils import Vector


def vector(values):
    return [round(float(value), 8) for value in values]


def blender_to_three(values):
    x, y, z = values
    return [round(float(x), 8), round(float(z), 8), round(float(-y), 8)]


def input_value(node, name):
    socket = node.inputs.get(name)
    if socket is None:
        return None
    value = socket.default_value
    if hasattr(value, "__len__"):
        return vector(value)
    return float(value)


lights = []
for object_name in ("Window_Sky_Fill", "Window_Sun"):
    obj = bpy.data.objects.get(object_name)
    if obj is None or obj.type != "LIGHT":
        lights.append({"name": object_name, "missing": True})
        continue

    data = obj.data
    world_position = obj.matrix_world.translation
    world_direction = obj.matrix_world.to_quaternion() @ Vector((0, 0, -1))
    light = {
        "name": obj.name,
        "data_name": data.name,
        "type": data.type,
        "position_blender": vector(world_position),
        "position_three": blender_to_three(world_position),
        "direction_blender": vector(world_direction),
        "direction_three": blender_to_three(world_direction),
        "rotation_euler": vector(obj.rotation_euler),
        "scale": vector(obj.scale),
        "color_linear": vector(data.color),
        "energy": float(data.energy),
        "use_shadow": bool(data.use_shadow),
        "diffuse_factor": float(data.diffuse_factor),
        "specular_factor": float(data.specular_factor),
        "volume_factor": float(data.volume_factor),
        "normalize": bool(getattr(data, "normalize", False)),
    }
    for attribute in (
        "shape",
        "size",
        "size_y",
        "shadow_soft_size",
        "spot_size",
        "spot_blend",
        "angle",
    ):
        if hasattr(data, attribute):
            value = getattr(data, attribute)
            light[attribute] = float(value) if isinstance(value, (int, float)) else value
    lights.append(light)


scene = bpy.context.scene
world = scene.world
world_info = None
if world:
    world_info = {
        "name": world.name,
        "color": vector(world.color),
        "use_nodes": bool(world.use_nodes),
        "environment_textures": [],
        "backgrounds": [],
        "mappings": [],
    }
    if world.use_nodes and world.node_tree:
        for node in world.node_tree.nodes:
            if node.type == "TEX_ENVIRONMENT":
                image = node.image
                path = None
                if image:
                    path = bpy.path.abspath(image.filepath, library=image.library)
                world_info["environment_textures"].append(
                    {
                        "node": node.name,
                        "image": image.name if image else None,
                        "filepath": os.path.normpath(path) if path else None,
                        "packed": bool(image and image.packed_file),
                        "packed_size": image.packed_file.size if image and image.packed_file else None,
                        "colorspace": image.colorspace_settings.name if image else None,
                        "projection": node.projection,
                        "interpolation": node.interpolation,
                        "extension": node.extension,
                    }
                )
            elif node.type == "BACKGROUND":
                world_info["backgrounds"].append(
                    {
                        "node": node.name,
                        "color": input_value(node, "Color"),
                        "strength": input_value(node, "Strength"),
                    }
                )
            elif node.type == "MAPPING":
                world_info["mappings"].append(
                    {
                        "node": node.name,
                        "location": input_value(node, "Location"),
                        "rotation": input_value(node, "Rotation"),
                        "scale": input_value(node, "Scale"),
                    }
                )


result = {
    "blend_file": bpy.data.filepath,
    "render_engine": scene.render.engine,
    "unit_system": scene.unit_settings.system,
    "unit_scale": scene.unit_settings.scale_length,
    "view_settings": {
        "look": scene.view_settings.look,
        "view_transform": scene.view_settings.view_transform,
        "exposure": scene.view_settings.exposure,
        "gamma": scene.view_settings.gamma,
    },
    "lights": lights,
    "world": world_info,
    "all_worlds": [
        {
            "name": candidate.name,
            "environment_nodes": [
                {
                    "node": node.name,
                    "image": node.image.name if node.image else None,
                    "filepath": (
                        os.path.normpath(
                            bpy.path.abspath(node.image.filepath, library=node.image.library)
                        )
                        if node.image
                        else None
                    ),
                    "packed": bool(node.image and node.image.packed_file),
                }
                for node in candidate.node_tree.nodes
                if node.type == "TEX_ENVIRONMENT"
            ]
            if candidate.node_tree
            else [],
        }
        for candidate in bpy.data.worlds
    ],
    "images": [
        {
            "name": image.name,
            "source": image.source,
            "filepath": os.path.normpath(
                bpy.path.abspath(image.filepath, library=image.library)
            )
            if image.filepath
            else None,
            "file_format": image.file_format,
            "size": list(image.size),
            "packed": bool(image.packed_file),
            "packed_size": image.packed_file.size if image.packed_file else None,
        }
        for image in bpy.data.images
    ],
}

print("CODEX_LIGHTING_JSON_START")
print(json.dumps(result, indent=2))
print("CODEX_LIGHTING_JSON_END")
