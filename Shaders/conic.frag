#version 330 core
in vec2 p;
out vec4 fragColor;
uniform vec3 color;
uniform float convex;

void main()
{	
	// gradients
	vec2 px = dFdx(p);
	vec2 py = dFdy(p);
	// chain rule
	float fx = (2.0f * p.x) * px.x - px.y;
	float fy = (2.0f * p.x) * py.x - py.y;   
	// signed distance
	float sd = convex * (p.x * p.x - p.y) / sqrt(fx * fx + fy * fy);
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
