#version 330 core

layout (location = 0) in vec2 aPos;
layout (location = 1) in vec3 aTexCoord;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

out vec3 p;

void main()
{
   gl_Position = projection * view * model * vec4(aPos, 0.0f, 1.0f);
   p = aTexCoord;
}