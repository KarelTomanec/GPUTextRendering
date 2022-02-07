#version 330 core
in vec3 p;
out vec4 fragColor;
uniform vec3 color;
void main()
{
	// gradients
	vec3 px = dFdx(p);
	vec3 py = dFdy(p);
	// chain rule
	float fx = (3.0f * p.x * p.x) * px.x - p.z * px.y - p.y * px.z;
	float fy = (3.0f * p.x * p.x) * py.x - p.z * py.y - p.y * py.z;
	// signed distance
	float sd = -(p.x * p.x * p.x - p.y * p.z) / sqrt(fx * fx + fy * fy);
	// mapping to opacity
	float alpha = 0.5f - sd;
	if(alpha >= 1.0f) {
		// inside
		fragColor = vec4(color, 1.0f);
	} else if (alpha < 0.0f) {
		// outside
		discard;
	} else {
		// boundary
		fragColor = vec4(color, alpha);
	}
}
